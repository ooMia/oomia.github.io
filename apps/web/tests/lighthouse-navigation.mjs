import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

// Deliberately separate from the preview/e2e server: both revisions receive the
// same compression and cache headers, and every audit gets a fresh browser.
const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  if (!process.argv[i].startsWith("--") || !process.argv[i + 1])
    throw new Error(
      "Arguments use --name value pairs; see the evidence README."
    );
  args.set(process.argv[i].slice(2), process.argv[i + 1]);
}
const output = resolve(
  args.get("output") ?? resolve(web, "../../test-results/lighthouse-navigation")
);
const runs = Number(args.get("runs") ?? 3);
const throttlingMethod = args.get("throttling-method") ?? "simulate";
if (!["simulate", "devtools"].includes(throttlingMethod))
  throw new Error("--throttling-method accepts simulate,devtools");
if (!Number.isInteger(runs) || runs < 1)
  throw new Error("--runs must be a positive integer");
const modes = (args.get("modes") ?? "desktop,mobile").split(",");
if (modes.some((mode) => !["desktop", "mobile"].includes(mode)))
  throw new Error("--modes accepts desktop,mobile");
const profiles = {
  desktop: {
    formFactor: "desktop",
    screenEmulation: {
      mobile: false,
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      disabled: false,
    },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
      cpuSlowdownMultiplier: 1,
    },
  },
  mobile: {
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      disabled: false,
    },
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1474.56,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4,
    },
  },
};
const requestedVariants = (
  args.get("variants") ??
  (args.has("baseline-dist") ? "baseline,candidate" : "candidate")
).split(",");
if (
  requestedVariants.some((label) => !["baseline", "candidate"].includes(label))
)
  throw new Error("--variants accepts baseline,candidate");
const variants = requestedVariants
  .filter((label) => args.has(`${label}-dist`) || label === "candidate")
  .map((label) => ({
    label,
    dist: resolve(args.get(`${label}-dist`) ?? resolve(web, "dist")),
  }));
const base = `/${(args.get("base") ?? "").replace(/^\/+|\/+$/g, "")}`.replace(
  /\/$/,
  ""
);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};
const save = async (path, data) =>
  writeFile(resolve(output, path), JSON.stringify(data, null, 2) + "\n");
const median = (values) => {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
function git(cwd, ...command) {
  try {
    return execFileSync("git", command, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}
async function serve(dist) {
  await stat(resolve(dist, "index.html"));
  const cache = new Map();
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname
      );
      if (base && pathname !== base && !pathname.startsWith(`${base}/`)) {
        response.writeHead(404).end();
        return;
      }
      const local = pathname.slice(base.length);
      let file = resolve(dist, `.${local}`);
      if (file !== dist && !file.startsWith(`${dist}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
      const type = contentTypes[extname(file)] ?? "application/octet-stream";
      const compressed =
        /text\/|javascript|json|svg|xml/.test(type) &&
        /gzip/.test(request.headers["accept-encoding"] ?? "");
      const key = `${file}:${compressed}`;
      if (!cache.has(key)) {
        const bytes = await readFile(file);
        cache.set(key, compressed ? gzipSync(bytes, { level: 6 }) : bytes);
      }
      const body = cache.get(key);
      response.writeHead(200, {
        "Content-Type": type,
        "Content-Length": body.length,
        "Cache-Control": "max-age=600",
        Vary: "Accept-Encoding",
        ...(compressed ? { "Content-Encoding": "gzip" } : {}),
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(0, "127.0.0.1", done);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}${base}/`,
    stop: () => new Promise((done) => server.close(done)),
  };
}
function auditSummary(lhr) {
  const network = lhr.audits["network-requests"]?.details?.items ?? [];
  const byType = {};
  for (const request of network) {
    const type = request.resourceType ?? "Other";
    const item = (byType[type] ??= {
      requests: 0,
      transferBytes: 0,
      resourceBytes: 0,
    });
    item.requests += 1;
    item.transferBytes += request.transferSize ?? 0;
    item.resourceBytes += request.resourceSize ?? 0;
  }
  const metric = (id) => lhr.audits[id]?.numericValue ?? null;
  return {
    lighthouseVersion: lhr.lighthouseVersion,
    fetchTime: lhr.fetchTime,
    browserUserAgent: lhr.environment.hostUserAgent,
    categories: Object.fromEntries(
      Object.entries(lhr.categories).map(([id, item]) => [id, item.score])
    ),
    metrics: {
      fcpMs: metric("first-contentful-paint"),
      lcpMs: metric("largest-contentful-paint"),
      speedIndexMs: metric("speed-index"),
      tbtMs: metric("total-blocking-time"),
      cls: metric("cumulative-layout-shift"),
      interactiveMs: metric("interactive"),
    },
    byType,
    externalRequests: network
      .filter(
        (request) =>
          !request.url.startsWith(
            lhr.finalDisplayedUrl?.split("/").slice(0, 3).join("/")
          )
      )
      .map(({ url, resourceType, transferSize, statusCode }) => ({
        url,
        resourceType,
        transferSize,
        statusCode,
      })),
    audits: Object.fromEntries(
      Object.entries(lhr.audits).map(([id, audit]) => [
        id,
        {
          score: audit.score,
          mode: audit.scoreDisplayMode,
          categoryReferences: Object.entries(lhr.categories).flatMap(
            ([category, item]) =>
              item.auditRefs
                .filter((ref) => ref.id === id)
                .map((ref) => ({ category, weight: ref.weight }))
          ),
          ...(audit.displayValue ? { displayValue: audit.displayValue } : {}),
          ...(audit.explanation ? { explanation: audit.explanation } : {}),
          ...(audit.errorMessage ? { errorMessage: audit.errorMessage } : {}),
          ...(audit.warnings?.length ? { warnings: audit.warnings } : {}),
        },
      ])
    ),
    warnings: lhr.runWarnings,
    runtimeError: lhr.runtimeError ?? null,
    diagnostics: Object.fromEntries(
      [
        "mainthread-work-breakdown",
        "long-tasks",
        "forced-reflow-insight",
        "cls-culprits-insight",
        "baseline",
        "valid-source-maps",
      ].map((id) => [id, lhr.audits[id]?.details ?? null])
    ),
  };
}
function coverageSummary(entries, origin) {
  return entries
    .filter((entry) => entry.url.startsWith(origin) && entry.source)
    .map((entry) => {
      // V8 reports nested positive/zero-count ranges. A simple sum double-counts
      // functions and treats unexecuted inner branches as executed outer code.
      const ranges = entry.functions.flatMap((fn) => fn.ranges);
      const points = [
        ...new Set(
          ranges.flatMap((range) => [range.startOffset, range.endOffset])
        ),
      ].sort((a, b) => a - b);
      let executed = 0;
      for (let i = 0; i < points.length - 1; i += 1) {
        const start = points[i];
        const end = points[i + 1];
        const containing = ranges
          .filter(
            (range) => range.startOffset <= start && range.endOffset >= end
          )
          .sort(
            (a, b) =>
              a.endOffset - a.startOffset - (b.endOffset - b.startOffset)
          );
        if (containing[0]?.count > 0) executed += end - start;
      }
      return {
        url: entry.url.replace(origin, ""),
        sourceUtf16CodeUnits: entry.source.length,
        executedUtf16CodeUnits: executed,
        executedPercent: Number(
          ((100 * executed) / entry.source.length).toFixed(2)
        ),
      };
    });
}
async function interactionEvidence(url, mode) {
  const browser = await chromium.launch({
    executablePath: chromePath,
    args: ["--disable-extensions"],
  });
  const profile = profiles[mode];
  const context = await browser.newContext({
    viewport: {
      width: profile.screenEmulation.width,
      height: profile.screenEmulation.height,
    },
    deviceScaleFactor: profile.screenEmulation.deviceScaleFactor,
    isMobile: mode === "mobile",
    hasTouch: mode === "mobile",
    colorScheme: "light",
  });
  try {
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) =>
      requests.push({ url: request.url(), type: request.resourceType() })
    );
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Toggle Theme" }).waitFor();
    const navigationCoverage = coverageSummary(
      await page.coverage.stopJSCoverage(),
      new URL(url).origin
    );
    const beforeScroll = requests.slice();
    // Reload in this fresh profile with coverage across the full interaction flow.
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await page.reload({ waitUntil: "networkidle" });
    const indicators = await page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.lang,
      landmarks: [
        ...document.querySelectorAll(
          "main,nav,header,footer,aside,[role=region]"
        ),
      ].map((el) => ({
        tag: el.tagName,
        name:
          el.getAttribute("aria-label") ?? el.getAttribute("aria-labelledby"),
        text: el.textContent.trim().slice(0, 60),
      })),
      headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
        (el) => ({ level: Number(el.tagName[1]), text: el.textContent.trim() })
      ),
      positiveTabIndices: [...document.querySelectorAll("[tabindex]")].filter(
        (el) => el.tabIndex > 0
      ).length,
      overflow: {
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
      },
      links: [...document.querySelectorAll("a[href]")].map((el) => ({
        text: el.textContent.trim(),
        ariaLabel: el.getAttribute("aria-label"),
        href: el.getAttribute("href"),
      })),
      structuredData: [
        ...document.querySelectorAll('script[type="application/ld+json"]'),
      ].map((el) => {
        try {
          return JSON.parse(el.textContent);
        } catch {
          return { invalidJSON: true };
        }
      }),
      featuredImage: (() => {
        const img = document.querySelector(".home-featured img");
        return img
          ? {
              src: img.getAttribute("src"),
              loading: img.loading,
              fetchPriority: img.fetchPriority,
              width: img.width,
              height: img.height,
            }
          : null;
      })(),
      gravatar: (() => {
        const frame = document.querySelector('iframe[title="gravatar card"]');
        const box = frame?.getBoundingClientRect();
        return frame
          ? {
              src: frame.getAttribute("src"),
              srcdoc: frame.hasAttribute("srcdoc"),
              loading: frame.loading,
              y: box.y,
              width: box.width,
              height: box.height,
            }
          : null;
      })(),
    }));
    const focusOrder = [];
    for (let i = 0; i < 16; i += 1) {
      await page.keyboard.press("Tab");
      focusOrder.push(
        await page.evaluate(() => {
          const el = document.activeElement;
          const style = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            text:
              el.getAttribute("aria-label") ??
              el.textContent.trim().slice(0, 80),
            href: el.getAttribute("href"),
            visible: box.width > 0 && box.height > 0,
            outline: `${style.outlineStyle} ${style.outlineWidth}`,
            boxShadow: style.boxShadow,
          };
        })
      );
    }
    const theme = page.getByRole("button", { name: "Toggle Theme" });
    await theme.focus();
    await theme.press("Enter");
    await page.locator("html.dark").waitFor();
    const themeKeyboard = await page.locator("html").getAttribute("class");
    const picker = page.locator(".home-tag-picker");
    const summary = picker.locator("summary");
    await summary.focus();
    await summary.press("ArrowDown");
    const options = picker.locator("button");
    const firstFocused = await options
      .first()
      .evaluate((el) => el === document.activeElement);
    await options.first().press("End");
    const lastFocused = await options
      .last()
      .evaluate((el) => el === document.activeElement);
    await options.last().press("Escape");
    const escapeReturned = await summary.evaluate(
      (el) => el === document.activeElement
    );
    const closed = !((await picker.getAttribute("open")) === "");
    await summary.press("Enter");
    const selected = options.nth(1);
    const selectedText = await selected.textContent();
    await selected.press("Enter");
    const filteredUrl = page.url();
    const pressed = await selected.getAttribute("aria-pressed");
    // Restore all articles without navigation before exercising the tag overflow.
    await summary.press("Enter");
    await options.first().press("Enter");
    const expander = page.locator(".tag-more:visible").first();
    let constrainedWidth = false;
    if (!(await expander.count())) {
      // Current real content need not overflow at these viewports. Exercise the
      // same component at a constrained width without inventing article data.
      await page
        .locator(".tag-collection")
        .first()
        .evaluate((el) => (el.style.width = "40px"));
      await page.waitForTimeout(200);
      constrainedWidth = true;
    }
    let overflow = { present: false, constrainedWidth };
    if (await expander.count()) {
      await expander.focus();
      await expander.press("Enter");
      const expanded = await expander.getAttribute("aria-expanded");
      const focusInMenu = await page.evaluate(() =>
        Boolean(document.activeElement?.closest(".tag-overflow"))
      );
      await page.keyboard.press("Escape");
      overflow = {
        present: true,
        constrainedWidth,
        expanded,
        focusInMenu,
        escapedToTrigger: await expander.evaluate(
          (el) => el === document.activeElement
        ),
        closed: (await expander.getAttribute("aria-expanded")) === "false",
      };
    }
    if (constrainedWidth)
      await page
        .locator(".tag-collection")
        .first()
        .evaluate((el) => el.style.removeProperty("width"));
    const frame = page.getByTitle("gravatar card");
    await frame.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const afterScroll = requests.slice();
    const interactedCoverage = coverageSummary(
      await page.coverage.stopJSCoverage(),
      new URL(url).origin
    );
    return {
      browserVersion: browser.version(),
      mode,
      throttled: false,
      providersMocked: false,
      navigationCoverage,
      interactedCoverage,
      coverageUnits:
        "UTF-16 code units from Chromium precise coverage; not transfer bytes. Runtime branches still unused after this finite interaction sequence are not proof of removable code.",
      indicators,
      focusOrder,
      themeKeyboard,
      tagPickerKeyboard: {
        firstFocused,
        lastFocused,
        escapeReturned,
        closed,
        selectedText,
        filteredUrl,
        pressed,
      },
      tagOverflowKeyboard: overflow,
      gravatarRequestsBeforeScroll: beforeScroll.filter((item) =>
        /gravatar\.com/.test(item.url)
      ),
      gravatarRequestsAfterScroll: afterScroll.filter((item) =>
        /gravatar\.com/.test(item.url)
      ),
      pageErrors: errors,
      manualLimit:
        "Keyboard/DOM indicators only. No screen reader or human visual sign-off was performed by this script; meaningful focus order, offscreen content, custom-control understanding and structured-data semantics still require human review.",
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

await mkdir(output, { recursive: true });
const chromePath =
  process.env["LIGHTHOUSE_CHROME_PATH"] ?? chromium.executablePath();
const lighthouseModule = process.env["LIGHTHOUSE_MODULE_PATH"];
const { default: lighthouse } = await import(
  lighthouseModule
    ? pathToFileURL(resolve(lighthouseModule)).href
    : "lighthouse"
);
const moduleRequire = createRequire(
  lighthouseModule
    ? resolve(lighthouseModule)
    : createRequire(import.meta.url).resolve("lighthouse")
);
const { launch } = await import(
  pathToFileURL(moduleRequire.resolve("chrome-launcher")).href
);
const results = [];
const interactions = [];
const metadata = {
  createdAt: new Date().toISOString(),
  lighthouseVersion: "13.4.1",
  chromePath,
  runs,
  modes,
  profiles,
  basePath: base || "/",
  throttlingMethod,
  server: {
    compression: "gzip level 6 for text/JS/CSS/SVG/JSON/XML",
    cacheControl: "max-age=600",
    note: "Identical local server for both builds, not GitHub Pages CDN latency, HTTP/2 or response security headers.",
  },
  variants: [],
};
for (const variant of variants) {
  const repo = resolve(variant.dist, "../../..");
  metadata.variants.push({
    ...variant,
    siteRevision: git(repo, "rev-parse", "HEAD"),
    siteChanges: git(repo, "status", "--porcelain"),
    docsRevision: git(
      resolve(repo, "apps/web/data/articles"),
      "rev-parse",
      "HEAD"
    ),
  });
  Object.assign(metadata.variants.at(-1), {
    trackedDiffSha256: createHash("sha256")
      .update(git(repo, "diff", "--binary", "HEAD") ?? "")
      .digest("hex"),
    homeHtmlSha256: createHash("sha256")
      .update(await readFile(resolve(variant.dist, "index.html")))
      .digest("hex"),
  });
  const server = await serve(variant.dist);
  try {
    for (const mode of modes) {
      if (args.get("lighthouse") !== "false") {
        for (let run = 1; run <= runs; run += 1) {
          console.log(`${variant.label}/${mode} navigation ${run}/${runs}`);
          const chrome = await launch({
            chromePath,
            chromeFlags: [
              "--headless=new",
              "--disable-extensions",
              "--disable-default-apps",
              "--no-first-run",
            ],
          });
          try {
            const result = await lighthouse(server.url, {
              port: chrome.port,
              output: "json",
              logLevel: "error",
              ...profiles[mode],
              throttlingMethod,
              disableStorageReset: false,
            });
            if (result.lhr.lighthouseVersion !== "13.4.1")
              throw new Error(
                `Expected Lighthouse 13.4.1, received ${result.lhr.lighthouseVersion}`
              );
            await writeFile(
              resolve(output, `${variant.label}-${mode}-${run}.json`),
              result.report + "\n"
            );
            if (run === 1 && result.artifacts?.Trace) {
              await writeFile(
                resolve(
                  output,
                  `${variant.label}-${mode}-${run}.trace.json.gz`
                ),
                gzipSync(JSON.stringify(result.artifacts.Trace))
              );
            }
            results.push({
              variant: variant.label,
              mode,
              run,
              ...auditSummary(result.lhr),
            });
            await save("runs-summary.json", { metadata, results });
          } catch (error) {
            const failed = {
              variant: variant.label,
              mode,
              run,
              error: String(error),
              categories: {},
              metrics: {},
              byType: {},
              audits: {},
            };
            results.push(failed);
            await save(`${variant.label}-${mode}-${run}.error.json`, failed);
            console.error(`${variant.label}/${mode}/${run}: ${String(error)}`);
          } finally {
            await chrome.kill();
          }
        }
      }
      if (args.get("interactions") !== "false") {
        console.log(
          `${variant.label}/${mode} keyboard and JavaScript coverage`
        );
        const evidence = {
          variant: variant.label,
          ...(await interactionEvidence(server.url, mode)),
        };
        interactions.push(evidence);
        await save(`${variant.label}-${mode}-interactions.json`, evidence);
      }
    }
  } finally {
    await server.stop();
  }
}
const medians = variants.flatMap(({ label }) =>
  modes.map((mode) => {
    const selected = results.filter(
      (item) =>
        item.variant === label &&
        item.mode === mode &&
        !item.error &&
        !item.runtimeError
    );
    return {
      variant: label,
      mode,
      successfulRuns: selected.length,
      categories: Object.fromEntries(
        Object.keys(selected[0]?.categories ?? {}).map((key) => [
          key,
          median(selected.map((item) => item.categories[key])),
        ])
      ),
      metrics: Object.fromEntries(
        Object.keys(selected[0]?.metrics ?? {}).map((key) => [
          key,
          median(selected.map((item) => item.metrics[key])),
        ])
      ),
      byType: Object.fromEntries(
        [...new Set(selected.flatMap((item) => Object.keys(item.byType)))].map(
          (key) => [
            key,
            {
              requests: median(
                selected.map((item) => item.byType[key]?.requests ?? 0)
              ),
              transferBytes: median(
                selected.map((item) => item.byType[key]?.transferBytes ?? 0)
              ),
              resourceBytes: median(
                selected.map((item) => item.byType[key]?.resourceBytes ?? 0)
              ),
            },
          ]
        )
      ),
    };
  })
);
await save("summary.json", { metadata, medians, results, interactions });
console.log(JSON.stringify({ output, medians }, null, 2));
if (results.some((item) => item.error || item.runtimeError))
  process.exitCode = 1;
