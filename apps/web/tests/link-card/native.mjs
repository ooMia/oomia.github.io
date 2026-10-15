import { chromium } from "@playwright/test";
import { preview } from "astro";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(
  new URL("../../native-rendering-evidence/", import.meta.url),
);
const origin = "http://127.0.0.1:4324";
const widths = [320, 390, 768, 1440];
const themes = ["light", "dark"];
const fixtures = await Promise.all(
  ["native-markdown", "native-mdx"].map(async (route) => {
    const extension = route === "native-markdown" ? "md" : "mdx";
    const markdown = await readFile(
      new URL(`./astro/src/content/${route}.${extension}`, import.meta.url),
      "utf8",
    );
    // Fence delimiters contribute no source characters; authored blank lines do.
    const sources = [
      ...markdown.matchAll(/^```(?:js|mermaid)\n([\s\S]*?)\n```/gm),
    ].map((match) => match[1]);
    assert.equal(sources.length, 3);
    assert.ok(
      sources[0].endsWith("\n"),
      "The code fixture must exercise a trailing authored blank line",
    );
    return { route, sources };
  }),
);
const server = await preview({
  root: fileURLToPath(new URL("./astro/", import.meta.url)),
  server: { host: "127.0.0.1", port: 4324 },
  logLevel: "error",
});
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL,
});
const observations = [];
const errors = [];
const externalRequests = [];

async function offline(context) {
  context.on("page", (page) =>
    page.on("pageerror", (error) => errors.push(error.message)),
  );
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    externalRequests.push(url.href);
    return route.abort();
  });
}

async function open(page, fixture, hydrate = true) {
  await page.goto(`${origin}/${fixture.route}/`);
  if (hydrate)
    await page.waitForFunction(
      () => !document.querySelector("astro-island[ssr]"),
    );
  await page.evaluate(() => document.fonts.ready);
}

async function theme(page, value) {
  const dark = await page
    .locator("html")
    .evaluate((el) => el.classList.contains("dark"));
  if (dark !== (value === "dark"))
    await page.getByRole("button", { name: "Toggle Theme" }).click();
  await page.waitForFunction(
    (value) =>
      document.documentElement.classList.contains("dark") ===
      (value === "dark"),
    value,
  );
}

async function staticContracts(page, fixture) {
  assert.equal(await page.locator("[data-native-code]").count(), 3);
  assert.equal(await page.locator("[data-mermaid]").count(), 2);
  assert.equal(
    await page.locator("[data-heading-contract] p").first().textContent(),
    "한글 문단입니다. English text stays intact. Stream<? extends Arguments> provideArguments(ExtensionContext context)를 구현합니다.",
  );
  assert.deepEqual(
    await page.locator("[data-code-source]").allTextContents(),
    fixture.sources,
  );
  assert.equal(await page.locator("[data-native-table] table").count(), 1);
  assert.deepEqual(
    await page.locator("[data-native-table] thead th").allTextContents(),
    ["분류", "긴 값"],
  );
  assert.equal(await page.locator("[data-native-table] tbody tr").count(), 1);
  assert.deepEqual(
    await page.locator("[data-native-table] tbody td").allTextContents(),
    ["Markdown", "long-value-".repeat(12)],
  );
  assert.equal(
    await page.locator("[data-native-table]").getAttribute("tabindex"),
    "0",
  );
  assert.equal(
    await page.locator("[data-native-table]").getAttribute("role"),
    "region",
  );
  assert.ok(
    await page.locator("[data-native-table]").getAttribute("aria-label"),
  );
  const contract = await page
    .locator("[data-heading-contract]")
    .evaluate((el) => ({
      headings: JSON.parse(el.dataset.headingContract),
      reading: JSON.parse(el.dataset.readingContract),
    }));
  assert.deepEqual(contract.headings, [
    {
      depth: 1,
      slug: "native-article-structure",
      text: "Native article structure",
    },
    { depth: 2, slug: "code", text: "Code" },
    { depth: 2, slug: "table", text: "Table" },
    { depth: 2, slug: "diagram", text: "Diagram" },
  ]);
  assert.ok(contract.reading.words.en > 0);
  assert.ok(contract.reading.words.ko > 0);
  assert.ok(contract.reading.minutes > 0);
  for (const uri of await page
    .locator("[data-mermaid-theme]")
    .evaluateAll((images) =>
      images.map((image) => image.getAttribute("src")),
    )) {
    assert.match(uri, /^data:image\/svg\+xml;base64,/);
    const svg = Buffer.from(uri.split(",")[1], "base64").toString("utf8");
    assert.match(svg, /<svg\b/);
    assert.doesNotMatch(svg, /<(?:script|foreignObject|iframe|image)\b/i);
  }
  return contract;
}

try {
  await mkdir(output, { recursive: true });
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await offline(context);
  const page = await context.newPage();
  const contracts = [];
  for (const fixture of fixtures) {
    await open(page, fixture);
    contracts.push(await staticContracts(page, fixture));
    for (const [index, source] of fixture.sources.entries()) {
      const frame = page.locator("[data-native-code]").nth(index);
      const button = frame.locator("[data-code-copy]");
      await button.click();
      await frame
        .locator('[data-code-copy][data-copy-state="copied"]')
        .waitFor();
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        source,
      );
      assert.match(
        await frame.locator("[data-copy-status]").textContent(),
        /복사|copied/i,
      );
    }
    // Clipboard rejection must expose selectable authored source, including Mermaid details.
    await page.evaluate(() =>
      Object.defineProperty(navigator.clipboard, "writeText", {
        configurable: true,
        value: async () => {
          throw new Error("Clipboard denied fixture");
        },
      }),
    );
    for (const [index, source] of fixture.sources.entries()) {
      const frame = page.locator("[data-native-code]").nth(index);
      await frame.locator("[data-code-copy]").click();
      await page.waitForFunction(
        (index) =>
          /단축키|shortcut/i.test(
            document.querySelectorAll("[data-copy-status]")[index]
              ?.textContent ?? "",
          ),
        index,
      );
      // Chrome's visible selection string omits a terminal blank line. Verify
      // that the selected DOM range still contains the complete authored value.
      assert.equal(
        await page.evaluate(
          () =>
            window.getSelection()?.getRangeAt(0).cloneContents().textContent,
        ),
        source,
        `${fixture.route} source selection ${index}`,
      );
      assert.match(
        await frame.locator("[data-copy-status]").textContent(),
        /단축키|shortcut/i,
      );
      if (index > 0)
        assert.equal(
          await frame.locator("details").evaluate((el) => el.open),
          true,
        );
    }
    await open(page, fixture);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      for (const value of themes) {
        await theme(page, value);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${fixture.route} overflow at ${width}/${value}`,
        );
        const diagrams = await page
          .locator("[data-mermaid]")
          .evaluateAll((frames) =>
            frames.map((frame) => {
              const visible = [
                ...frame.querySelectorAll("[data-mermaid-theme]"),
              ].filter((image) => getComputedStyle(image).display !== "none");
              return visible.map((image) => ({
                theme: image.dataset.mermaidTheme,
                loaded: image.naturalWidth > 0,
                width: image.getBoundingClientRect().width,
                height: image.getBoundingClientRect().height,
                intrinsicWidth: Number(image.getAttribute("width")),
                intrinsicHeight: Number(image.getAttribute("height")),
                container: frame.getBoundingClientRect().width,
              }));
            }),
          );
        for (const visible of diagrams) {
          assert.equal(visible.length, 1);
          assert.equal(visible[0].theme, value);
          assert.equal(visible[0].loaded, true);
          assert.ok(visible[0].intrinsicWidth > 0);
          assert.ok(visible[0].intrinsicHeight > 0);
          assert.ok(visible[0].width <= visible[0].container + 1);
          assert.ok(visible[0].width <= visible[0].intrinsicWidth + 1);
          assert.ok(
            Math.abs(
              visible[0].height -
                (visible[0].width * visible[0].intrinsicHeight) /
                  visible[0].intrinsicWidth,
            ) < 2,
          );
        }
        observations.push({
          fixture: fixture.route,
          width,
          theme: value,
          diagrams,
        });
        if ([320, 1440].includes(width))
          await page.screenshot({
            path: `${output}/${fixture.route}-${width}-${value}.png`,
            fullPage: true,
          });
      }
    }
  }
  assert.deepEqual(contracts[0], contracts[1]);
  await context.close();
  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 1000 },
  });
  await offline(noJs);
  const staticPage = await noJs.newPage();
  for (const fixture of fixtures) {
    await staticPage.setViewportSize({ width: 320, height: 1000 });
    await open(staticPage, fixture, false);
    await staticContracts(staticPage, fixture);
    assert.deepEqual(
      await staticPage
        .locator("[data-code-copy]")
        .evaluateAll((buttons) => buttons.map((button) => button.disabled)),
      [true, true, true],
    );
    for (const details of await staticPage
      .locator("[data-mermaid] details")
      .all()) {
      await details.locator("summary").click();
      assert.equal(await details.evaluate((el) => el.open), true);
      assert.equal(await details.locator("code").isVisible(), true);
    }
    assert.ok(
      await staticPage
        .locator("[data-native-table]")
        .evaluate((el) => el.scrollWidth > el.clientWidth),
      "Long table must remain scrollable without JavaScript",
    );
    for (const width of widths) {
      await staticPage.setViewportSize({ width, height: 1000 });
      assert.ok(
        await staticPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${fixture.route} no-JS overflow at ${width}`,
      );
    }
  }
  await noJs.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(
    externalRequests,
    [],
    "Native fixtures must not request external resources",
  );
  const result = {
    result: "PASS",
    browser: browser.version(),
    fixtures: fixtures.map((f) => f.route),
    widths,
    themes,
    exactSourceClipboard: true,
    clipboardFailureSelection: true,
    staticWithoutJavaScript: true,
    externalRequests: 0,
    pageErrors: errors.length,
    observations,
  };
  await writeFile(`${output}/validation.json`, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify(
      { ...result, observations: observations.length, output },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.stop();
}
