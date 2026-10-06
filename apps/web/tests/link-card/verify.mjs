import { chromium } from "@playwright/test";
import { preview } from "astro";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./astro/", import.meta.url));
const output = fileURLToPath(
  new URL("../../link-card-evidence/", import.meta.url)
);
const server = await preview({
  root,
  server: { host: "127.0.0.1", port: 4322 },
  logLevel: "error",
});
const browser = await chromium.launch({ headless: true });
const observations = [];
try {
  await mkdir(output, { recursive: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") return route.continue();
    if (url.href === "https://images.example.com/preview.png")
      return route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g"><stop stop-color="#d6efe6"/><stop offset="1" stop-color="#b7d4ea"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="480" cy="100" r="65" fill="#fff" opacity=".45"/><path d="M0 360 180 130 330 270 480 175 640 360" fill="#638c8d" opacity=".5"/><text x="32" y="52" font-family="sans-serif" font-size="24" fill="#294c54">Local preview fixture</text></svg>',
      });
    return route.abort();
  });
  const commonContracts = [];
  for (const route of ["common-markdown", "common-mdx"]) {
    await page.goto(`http://127.0.0.1:4322/${route}/`);
    commonContracts.push(
      await page.locator("[data-heading-contract]").evaluate((el) => ({
        headings: JSON.parse(el.getAttribute("data-heading-contract")),
        reading: JSON.parse(el.getAttribute("data-reading-contract")),
      }))
    );
  }
  assert.deepEqual(commonContracts[0], commonContracts[1]);
  assert.deepEqual(commonContracts[0].headings, [
    { depth: 1, slug: "shared-heading", text: "Shared heading" },
    { depth: 2, slug: "shared-detail", text: "Shared detail" },
  ]);
  assert.ok(commonContracts[0].reading.words.en > 0);
  assert.ok(commonContracts[0].reading.words.ko > 0);
  assert.ok(commonContracts[0].reading.minutes > 0);
  await page.goto("http://127.0.0.1:4322/markdown/");
  assert.equal(await page.locator("a.link-card").count(), 0);
  assert.equal(
    await page.locator('a[href="https://example.com/rich"]').textContent(),
    "Authored label"
  );
  assert.match(
    await page.locator(".article-body").innerText(),
    /\{literal braces\}/
  );
  assert.match(
    await page.locator(".article-body").innerText(),
    /export const remainsText/
  );
  await page.goto("http://127.0.0.1:4322/mdx/");
  assert.equal(await page.locator("a.link-card").count(), 10);
  assert.equal(await page.locator('[data-link-card-kind="rich"]').count(), 8);
  assert.equal(await page.locator('[data-link-card-kind="basic"]').count(), 2);
  assert.equal(await page.locator(".link-card__row").count(), 24);
  assert.equal(
    await page
      .locator(".link-card button, .link-card a, p > .link-card")
      .count(),
    0
  );
  assert.equal(
    await page
      .locator('.link-card[href="https://example.com/text"] img')
      .count(),
    0
  );
  assert.equal(
    await page
      .locator('a[href="https://example.com/missing"] strong')
      .textContent(),
    "fallback"
  );
  assert.equal(
    await page.locator("a.authored").getAttribute("target"),
    "_blank"
  );
  assert.equal(
    await page.locator("a.authored").getAttribute("rel"),
    "noopener"
  );
  assert.equal(
    await page.locator("a.authored img").getAttribute("src"),
    "https://images.example.com/preview.png"
  );
  assert.ok(
    (await page.locator(".article-body").innerText()).includes(
      "Rich <title> & literal {braces}"
    )
  );
  assert.ok(
    !(await page.locator(".article-body").innerText()).includes(
      "Full local provider summary"
    )
  );
  assert.equal(
    await page
      .getByRole("link", { name: "source label", exact: true })
      .getAttribute("data-link-card"),
    null
  );
  assert.equal(
    await page
      .getByRole("link", { name: "JSX source label", exact: true })
      .getAttribute("data-link-card"),
    null
  );
  assert.equal(
    await page
      .getByRole("link", { name: "Dynamic expression stays native" })
      .getAttribute("data-link-card"),
    null
  );
  await page.locator("a.link-card").first().focus();
  assert.equal(
    await page
      .locator("a.link-card")
      .first()
      .evaluate((el) => document.activeElement === el),
    true
  );
  assert.equal(
    await page.locator("[role=dialog], [data-link-detail]").count(),
    0
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (theme) =>
          document.documentElement.classList.toggle("dark", theme === "dark"),
        theme
      );
      await page.evaluate(() => document.fonts.ready);
      const rows = await page
        .locator(".link-card__row")
        .evaluateAll((elements) =>
          elements.map((el) => ({
            text: el.textContent,
            width: el.clientWidth,
            scrollWidth: el.scrollWidth,
            height: el.getBoundingClientRect().height,
            lineHeight: Number.parseFloat(getComputedStyle(el).lineHeight),
            overflow: getComputedStyle(el).overflow,
            textOverflow: getComputedStyle(el).textOverflow,
          }))
        );
      for (const row of rows) {
        assert.ok(
          row.height <= row.lineHeight + 1,
          `Wrapped at ${width}/${theme}: ${JSON.stringify(row)}`
        );
        assert.ok(
          row.scrollWidth <= row.width + 1,
          `Overflow at ${width}/${theme}: ${JSON.stringify(row)}`
        );
        assert.notEqual(row.textOverflow, "ellipsis");
        assert.notEqual(row.overflow, "hidden");
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      );
      observations.push({ width, theme, rows });
      if ([320, 1440].includes(width))
        await page.screenshot({
          path: `${output}/${width}-${theme}.png`,
          fullPage: true,
        });
    }
  }
  // Overlong producer output stays readable instead of clipping or ellipsis.
  await page.setViewportSize({ width: 320, height: 1000 });
  const overflow = await page
    .locator(".link-card__row")
    .first()
    .evaluate((el) => {
      el.textContent = "가".repeat(80);
      return {
        height: el.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(getComputedStyle(el).lineHeight),
        textOverflow: getComputedStyle(el).textOverflow,
      };
    });
  assert.ok(overflow.height > overflow.lineHeight);
  assert.notEqual(overflow.textOverflow, "ellipsis");
  const enterNavigation = page.waitForRequest(
    (request) =>
      request.isNavigationRequest() &&
      request.url() === "https://example.com/rich"
  );
  await page.locator("a.link-card").first().focus();
  await page.keyboard.press("Enter");
  assert.equal((await enterNavigation).url(), "https://example.com/rich");
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const touchPage = await mobile.newPage();
  await touchPage.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort()
  );
  await touchPage.goto("http://127.0.0.1:4322/mdx/");
  assert.equal(
    await touchPage.locator("[role=dialog], [data-link-detail]").count(),
    0
  );
  const tapNavigation = touchPage.waitForRequest(
    (request) =>
      request.isNavigationRequest() &&
      request.url() === "https://example.com/rich"
  );
  await touchPage.locator("a.link-card").first().tap();
  assert.equal((await tapNavigation).url(), "https://example.com/rich");
  await mobile.close();
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/observations.json`,
    JSON.stringify(observations, null, 2)
  );
  console.log(
    JSON.stringify(
      {
        nativeMarkdownCards: 0,
        mdxCards: 10,
        richCards: 8,
        basicCards: 2,
        summaryRows: 24,
        widths: [320, 390, 768, 1440],
        themes: ["light", "dark"],
        calibratedFixtureCodePointBound: 14,
        externalBrowserRequests: "blocked",
        pageErrors: errors.length,
        output,
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
  await server.stop();
}
