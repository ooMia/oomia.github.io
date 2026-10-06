import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const html = readFileSync(
  new URL("./astro/dist/index.html", import.meta.url),
  "utf8"
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const requests = [];
  await page.route("**/*", (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.setContent(html);
  const md = page.locator(
    '[data-collection="fixtures"][data-entry="markdown"]'
  );
  const mdx = page.locator('[data-collection="fixtures"][data-entry="mdx"]');
  assert.equal(await md.locator('[data-link-card="component"]').count(), 1);
  assert.equal(await mdx.locator('[data-link-card="component"]').count(), 1);
  assert.match(await md.innerText(), /\{1 \+ 1\}/);
  assert.match(await md.innerText(), /export const shouldRemainText = 42/);
  assert.equal(
    await md.locator(".raw-html").textContent(),
    "Raw HTML with {literal braces}"
  );
  assert.equal(
    await mdx.locator(".callout").textContent(),
    "Actual MDX component"
  );
  assert.match(await mdx.innerText(), /\b42\b/);
  assert.doesNotMatch(await mdx.innerText(), /export const answer/);
  const tdd = page.locator('[data-entry="tech/log/tdd-dev-flow"]');
  assert.equal(await tdd.locator('[data-link-card="component"]').count(), 1);
  const corpusCount = await page.locator('[data-collection="corpus"]').count();
  assert.equal(corpusCount, 10);
  assert.equal(
    await page
      .locator(
        '[data-entry="tech/log/woowa-precourse-parameterized-test"] .callout'
      )
      .count(),
    1
  );
  assert.equal(await md.locator("h1[id]").count(), 0); // observed adapter limitation
  assert.equal(await mdx.locator("h1[id]").count(), 1);
  assert.equal(await page.locator("script").count(), 0);
  const emittedJs = readdirSync(
    new URL("./astro/dist/_astro/", import.meta.url)
  ).filter((name) => name.endsWith(".js"));
  const result = {
    corpusCount,
    fixtureCount: 2,
    componentCards: await page.locator('[data-link-card="component"]').count(),
    headingIds: { markdown: false, mdx: true },
    pageScriptTags: 0,
    emittedUnreferencedJsFiles: emittedJs.length,
    htmlBytes: Buffer.byteLength(html),
    blockedBrowserRequests: requests.length,
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
