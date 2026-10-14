import type { Locator, Page, TestInfo } from "@playwright/test";

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

async function headingSettled(heading: Locator) {
  let previous: number | undefined;
  await expect
    .poll(async () => {
      const box = await heading.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, viewport: innerHeight };
      });
      const stable =
        previous !== undefined && Math.abs(box.top - previous) < 0.5;
      previous = box.top;
      return stable && box.top >= 0 && box.bottom <= box.viewport;
    })
    .toBe(true);
}

test("canonical article metadata, responsive TOC, keyboard and active anchors", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(utility);
  await expect(page.locator("article header h1")).toHaveText("유틸리티 클래스");
  await expect(page.locator("article header")).toContainText(
    "평범한 나의 생산성을 높이는 방법은 바퀴를 다시 만들지 않는 것이었다."
  );
  await expect(page.locator("article header")).toContainText("6분 읽기");
  await expect(
    page.getByRole("button", { name: "Toggle Theme" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Switch to English", exact: true })
  ).toBeVisible();
  await noOverflow(page);
  expect(
    await page
      .locator("[data-reading-body]")
      .evaluate((el) => el.getBoundingClientRect().width)
  ).toBeLessThanOrEqual(768);
  const toc = page.getByRole("navigation", { name: "글 목차" });
  await expect(toc).toHaveCount(1);
  const summary = toc.locator("summary");
  const compact = (await summary.count()) > 0;
  await evidence(page, info, "light");
  if (compact) {
    await summary.focus();
    await page.keyboard.press("Enter");
  }
  await expect(
    toc.getByRole("link", { name: "유틸리티화", exact: true })
  ).toBeVisible();
  await toc.getByRole("link", { name: "유틸리티화", exact: true }).click();
  await expect(page).toHaveURL(/#(?:유틸리티화|%EC%9C%A0)/);
  const heading = page.locator("h2").filter({ hasText: /^유틸리티화$/ });
  await expect(heading).toBeFocused();
  await headingSettled(heading);
  if (!compact) await expect(toc).toBeInViewport();
  if (compact) {
    await expect(toc.locator("details")).not.toHaveAttribute("open", "");
    await expect(summary).toContainText("유틸리티화");
  }
  const activeLink = toc.getByRole("link", {
    name: "유틸리티화",
    exact: true,
    includeHidden: true,
  });
  await expect(activeLink).toHaveAttribute("data-active", "true");
  await expect(activeLink).toHaveAttribute("aria-current", "location");
  if (compact) {
    // Reopening an inline outline scrolls back to it and may change Core's active heading.
    await summary.click();
    await page.keyboard.press("Escape");
    await expect(toc.locator("details")).not.toHaveAttribute("open", "");
    await expect(summary).toBeFocused();
    await summary.click();
  }
  const later = toc.getByRole("link", {
    name: "지속적인 관리 및 개발",
    exact: true,
    includeHidden: true,
  });
  await later.click();
  const laterHeading = page.getByRole("heading", {
    name: "지속적인 관리 및 개발",
    exact: true,
  });
  await expect(laterHeading).toBeFocused();
  await headingSettled(laterHeading);
  if (compact) {
    await expect(summary).toContainText("지속적인 관리 및 개발");
  }
  await expect(later).toHaveAttribute("data-active", "true");
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
  const files = (await readdir("dist/articles", { recursive: true }))
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file.endsWith("index.html"));
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
  const summary = toc.locator("summary");
  if (await summary.count()) await summary.click();
  await toc.getByRole("link", { name: "유틸리티화", exact: true }).click();
  await expect(page).toHaveURL(/#(?:유틸리티화|%EC%9C%A0)/);
  await headingSettled(
    page.getByRole("heading", { name: "유틸리티화", exact: true })
  );
  await context.close();
});
