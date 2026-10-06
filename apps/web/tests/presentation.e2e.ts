import type { Page, TestInfo } from "@playwright/test";

import { expect, test } from "@playwright/test";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const base = (process.env["PRESENTATION_BASE"] ?? "").replace(/\/$/, "");
const route = (slug: string) => `${base}/articles/${slug}/`;
const utility = route("tech/log/woowa-precourse-utility");

async function evidence(page: Page, info: TestInfo, name: string) {
  const directory = process.env["PRESENTATION_EVIDENCE_DIR"];
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => {}))
    );
  });
  await page.screenshot({
    path: join(directory, `${info.project.name}-${name}.png`),
  });
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
}

test("canonical article metadata, sticky TOC, keyboard and active anchors", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(utility);
  await expect(page.locator("article header h1")).toHaveText("유틸리티 클래스");
  await expect(page.locator("article header")).toContainText(
    "평범한 나의 생산성을 높이는 방법은 바퀴를 다시 만들지 않는 것이었다."
  );
  await expect(page.locator("article header")).toContainText("6 min read");
  await expect(
    page.getByRole("button", { name: "Toggle Theme" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "GitHub", exact: true })
  ).toBeVisible();
  await noOverflow(page);
  expect(
    await page
      .locator("article")
      .evaluate((el) => el.getBoundingClientRect().width)
  ).toBeLessThanOrEqual(768);
  expect(
    await page
      .locator("body")
      .evaluate((el) => el.getBoundingClientRect().width)
  ).toBe(info.project.use.viewport?.width);
  const toc = page.getByRole("navigation", { name: "글 목차" });
  const summary = toc.locator("summary");
  await evidence(page, info, "light");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(
    toc.getByRole("link", { name: "유틸리티화", exact: true })
  ).toBeVisible();
  await toc.getByRole("link", { name: "유틸리티화", exact: true }).click();
  await expect(page).toHaveURL(/#(?:유틸리티화|%EC%9C%A0)/);
  await expect(toc.locator("details")).not.toHaveAttribute("open", "");
  await expect(summary).toContainText("유틸리티화");
  const heading = page.locator("h2").filter({ hasText: /^유틸리티화$/ });
  expect(
    await heading.evaluate((el) => el.getBoundingClientRect().top)
  ).toBeGreaterThanOrEqual(100);
  expect(await toc.evaluate((el) => el.getBoundingClientRect().top)).toBe(56);
  await summary.click();
  await expect(
    toc.getByRole("link", { name: "유틸리티화", exact: true })
  ).toHaveAttribute("data-active", "true");
  await page.keyboard.press("Escape");
  await expect(toc.locator("details")).not.toHaveAttribute("open", "");
  await page
    .locator("h2")
    .filter({ hasText: /^지속적인 관리 및 개발$/ })
    .evaluate((el) => {
      window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 128);
    });
  await expect(summary).toContainText("지속적인 관리 및 개발");
  expect(errors).toEqual([]);
});

test(
  "theme persists across reload and shared homepage navigation",
  { tag: "@compat" },
  async ({ page }, info) => {
    await page.goto(utility);
    await page.getByRole("button", { name: "Toggle Theme" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("theme")))
      .toBe("dark");
    await evidence(page, info, "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page
      .getByRole("navigation", { name: "사이트" })
      .getByRole("link", { name: "ooMia", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${base}/$`));
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Toggle Theme" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.keyboard.press("d");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  }
);

test(
  "homepage article links stay within the configured base path",
  { tag: "@compat" },
  async ({ page }) => {
    await page.goto(`${base}/`);
    const articleLinks = page.locator('a[href*="/articles/"]');

    expect(await articleLinks.count()).toBeGreaterThan(0);
    const hrefs = await articleLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href"))
    );
    expect(hrefs.every((href) => href !== null && !href.startsWith("//"))).toBe(
      true
    );

    await articleLinks.first().click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toMatch(new RegExp(`^${base}/articles/`));
  }
);

test("system dark preference is respected without an explicit saved theme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(utility);
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("Callout and native Markdown links retain their semantics", async ({
  page,
}, info) => {
  await page.goto(route("tech/log/woowa-precourse-parameterized-test"));
  const callout = page.locator("aside.callout[data-tone=info]");
  await expect(callout).toContainText("surrogate pair");
  await callout.evaluate((el) =>
    window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 128)
  );
  await noOverflow(page);
  await evidence(page, info, "callout-light");
  await page.getByRole("button", { name: "Toggle Theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await evidence(page, info, "callout-dark");
  await page.goto(route("tech/log/tdd-dev-flow"));
  await expect(page.locator("a.link-card")).toHaveCount(0);
  const card = page.locator(
    'a[href="https://www.jetbrains.com/help/idea/working-with-source-code.html"]'
  );
  await expect(card).toHaveAttribute(
    "href",
    "https://www.jetbrains.com/help/idea/working-with-source-code.html"
  );
  await expect(card).not.toHaveAttribute("data-link-card", "true");
  await expect(card).toContainText("jetbrains.com");
  await card.evaluate((el) =>
    window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 128)
  );
  await noOverflow(page);
  await evidence(page, info, "link-card-dark");
  await page.getByRole("button", { name: "Toggle Theme" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await evidence(page, info, "link-card-light");
});

test("full built corpus hydrates without overflow or broken local images", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const files = (await readdir("dist/articles", { recursive: true })).filter(
    (file) => file.endsWith("index.html")
  );
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    await page.goto(route(file.replace(/\/index\.html$/, "")));
    await expect(page.locator("article header h1")).not.toBeEmpty();
    await expect(
      page.getByRole("button", { name: "Toggle Theme" })
    ).toBeVisible();
    await noOverflow(page);
    // The canonical corpus already authors record.m4a as an image; media transforms are outside #35.
    const sourceLessImages = await page
      .locator("article img:not([src])")
      .count();
    expect(sourceLessImages).toBe(
      file.startsWith("tech/troubleshoot/vscode-invalid-wsl-distribution/")
        ? 1
        : 0
    );
    const images = page.locator("article img[src]");
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate((el) => (el as HTMLImageElement).naturalWidth)
        )
        .toBeGreaterThan(0);
    }
  }
  expect(errors).toEqual([]);
});

test("article and native TOC remain readable without JavaScript", async ({
  browser,
}) => {
  const info = test.info();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: info.project.use.baseURL ?? "http://127.0.0.1:4321",
    viewport: info.project.use.viewport ?? { width: 1440, height: 1000 },
    isMobile: info.project.use.isMobile ?? false,
    hasTouch: info.project.use.hasTouch ?? false,
  });
  const page = await context.newPage();
  await page.goto(utility);
  await expect(page.locator("article header h1")).toHaveText("유틸리티 클래스");
  const toc = page.getByRole("navigation", { name: "글 목차" });
  await toc.locator("summary").click();
  await toc.getByRole("link", { name: "유틸리티화", exact: true }).click();
  await expect(page).toHaveURL(/#(?:유틸리티화|%EC%9C%A0)/);
  await context.close();
});
