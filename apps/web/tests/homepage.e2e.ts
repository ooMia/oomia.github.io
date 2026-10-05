import type { Page } from "@playwright/test";

import { expect, test } from "@playwright/test";

const base = (process.env["PRESENTATION_BASE"] ?? "").replace(/\/$/, "");
const providers = [
  "ghstats.dev",
  "streak-stats.demolab.com",
  "github-readme-solvedac.hyp3rflow.vercel.app",
];
const activitySelector = 'section[aria-labelledby="profile-activity"]';
const articlesSelector = 'section[aria-labelledby="recent-articles"]';

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
}

// Deterministic layout stress; these fixtures do not establish provider availability.
async function mockProviders(page: Page, failedHost?: string) {
  for (const host of providers) {
    await page.route(`https://${host}/**`, (route) =>
      host === failedHost
        ? route.abort()
        : route.fulfill({
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="300"><rect width="1400" height="300" fill="#282828"/></svg>',
          })
    );
  }
}

test(
  "compact homepage hierarchy, contacts and shared theme",
  { tag: "@compat" },
  async ({ page }) => {
    await mockProviders(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/`);
    await expect(page.locator("#homepage h1")).toHaveText("ooMia");
    await expect(page.locator("#homepage > header p")).toHaveText(
      "구조를 고민하고, 작게 실험하며, 오래 쓸 수 있는 소프트웨어를 만듭니다."
    );
    await expect(page).toHaveTitle("ooMia — 개발 기록과 실험");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /ooMia/
    );
    expect(
      await page
        .locator("#homepage")
        .evaluate((el) => Array.from(el.children).map((child) => child.tagName))
    ).toEqual(["HEADER", "SECTION", "SECTION"]);
    const contacts = page.getByRole("navigation", { name: "연락처" });
    for (const [name, href] of [
      ["GitHub", "https://github.com/ooMia"],
      ["LinkedIn", "https://www.linkedin.com/in/김현학/"],
      ["Email", "mailto:dev@oomia.click"],
    ] as const) {
      const link = contacts.getByRole("link", { name, exact: true });
      await expect(link).toHaveAttribute("href", href!);
      await link.focus();
      await expect(link).toBeFocused();
    }
    await page.locator(activitySelector).scrollIntoViewIfNeeded();
    for (const img of await page.locator(`${activitySelector} img`).all()) {
      await img.locator("..").scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute("alt", "");
      await expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
      await expect(img).toHaveAttribute("width", "700");
      await expect(img).toHaveAttribute("height", /^(80|195|150)$/);
      await expect
        .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
        .toBe(1400);
    }
    await noOverflow(page);
    await page.getByRole("button", { name: "Toggle Theme" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await noOverflow(page);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(errors).toEqual([]);
  }
);

test("email keyboard activation", async ({ page }) => {
  await mockProviders(page);
  await page.goto(`${base}/`);
  const contacts = page.getByRole("navigation", { name: "연락처" });
  // Verify activation without leaving the test or opening the OS mail client.
  await contacts.evaluate((el) =>
    el.addEventListener("click", (event) => {
      event.preventDefault();
      const target = event.target as HTMLAnchorElement;
      el.setAttribute("data-activated", target.getAttribute("href") ?? "");
    })
  );
  await contacts
    .getByRole("link", { name: "Email", exact: true })
    .press("Enter");
  await expect(contacts).toHaveAttribute(
    "data-activated",
    "mailto:dev@oomia.click"
  );
});

test("discovery metadata agrees with canonical article pages and ordering", async ({
  page,
}) => {
  await mockProviders(page);
  await page.goto(`${base}/`);
  const entries = await page
    .locator(`${articlesSelector} li`)
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        href: node.querySelector("a")!.getAttribute("href")!,
        title: node.querySelector("h3")!.textContent!.trim(),
        description: node.querySelector("p")!.textContent!.trim(),
        date: node.querySelector("time")?.getAttribute("datetime"),
        reading: node.textContent!.match(/\d+ min read/)![0],
        tags: Array.from(node.querySelectorAll("p"))
          .slice(1)
          .map((p) => p.textContent!.trim()),
      }))
    );
  expect(entries.length).toBeGreaterThan(0);
  expect(await page.locator(`${articlesSelector} [rel="author"]`).count()).toBe(
    0
  );
  await expect(page.locator(articlesSelector)).not.toContainText("Updated");
  const expected = [...entries].sort((a, b) => {
    if (a.date && b.date && a.date !== b.date)
      return Date.parse(b.date) - Date.parse(a.date);
    if (Boolean(a.date) !== Boolean(b.date)) return a.date ? -1 : 1;
    return a.href < b.href ? -1 : a.href > b.href ? 1 : 0;
  });
  expect(entries).toEqual(expected);
  for (const entry of entries) {
    await page.goto(entry.href);
    const header = page.locator("article header");
    await expect(header.locator("h1")).toHaveText(entry.title);
    await expect(header.locator("p")).toHaveText(entry.description);
    await expect(header).toContainText(entry.reading);
    if (entry.date)
      await expect(header.locator("time").first()).toHaveAttribute(
        "datetime",
        entry.date
      );
    const tags = await header
      .getByRole("list", { name: "Tags" })
      .locator("li")
      .allTextContents();
    expect(tags.join(" ")).toBe(entry.tags.join(" "));
  }
});

for (const host of providers) {
  test(
    `activity remains isolated when ${host} fails`,
    { tag: host === providers[0] ? "@compat" : [] },
    async ({ page }) => {
      await mockProviders(page, host);
      await page.goto(`${base}/`);
      const titles = await page
        .locator(`${articlesSelector} h3`)
        .allTextContents();
      for (const img of await page.locator(`${activitySelector} img`).all()) {
        await img.locator("..").scrollIntoViewIfNeeded();
        await expect
          .poll(() => img.evaluate((el) => (el as HTMLImageElement).complete))
          .toBe(true);
        const failed = (await img.getAttribute("src"))!.includes(host);
        expect(
          await img.evaluate((el) => (el as HTMLImageElement).naturalWidth)
        ).toBe(failed ? 0 : 1400);
        const fallback = img.locator("..");
        if (failed) {
          await expect(img).toBeHidden();
          await expect(fallback.locator("p")).toBeVisible();
          await expect(fallback).toContainText(
            "활동 이미지를 불러올 수 없습니다"
          );
        } else {
          await expect(img).toBeVisible();
          await expect(fallback.locator("p")).toBeHidden();
        }
      }
      await expect(
        page.locator(`${activitySelector} figcaption a`)
      ).toHaveCount(3);
      expect(
        await page.locator(`${articlesSelector} h3`).allTextContents()
      ).toEqual(titles);
      await noOverflow(page);
      await page.locator(`${articlesSelector} a`).first().click();
      await expect(page.locator("article header h1")).toHaveText(titles[0]!);
    }
  );
}

test("activity reserves geometry before provider load and failure", async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  for (const host of providers) {
    await page.route(`https://${host}/**`, async (route) => {
      await pending;
      if (host === providers[0]) await route.abort();
      else
        await route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="300"/>',
        });
    });
  }
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const images = page.locator(`${activitySelector} img`);
  const geometry = () =>
    images.evaluateAll((nodes) =>
      nodes.map((img) => {
        const box = img.parentElement!.getBoundingClientRect();
        return { width: box.width, height: box.height };
      })
    );
  try {
    for (const img of await images.all())
      await img.locator("..").scrollIntoViewIfNeeded();
    const before = await geometry();
    expect(before.every((box) => box.width > 0 && box.height > 0)).toBe(true);
    release();
    await expect(images.first()).toBeHidden();
    for (const img of (await images.all()).slice(1)) {
      await expect
        .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
        .toBe(1400);
    }
    expect(await geometry()).toEqual(before);
    await noOverflow(page);
  } finally {
    release();
  }
});
