import type { Page } from "@playwright/test";

import { expect, test } from "@playwright/test";
import { readdir } from "node:fs/promises";

const base = (process.env["PRESENTATION_BASE"] ?? "").replace(/\/$/, "");
const providers = [
  "ghstats.dev",
  "streak-stats.demolab.com",
  "github-readme-solvedac.hyp3rflow.vercel.app",
];
const activitySelector = 'section[aria-labelledby="profile-activity"]';
const articlesSelector = 'section[aria-labelledby="recent-articles"]';
const gravatarUrl = "https://gravatar.com/oomia6.card";
const gravatarFixture = `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <style>html,body{margin:0;width:351px;height:436px}body{position:relative;background:#e3eafc}
  a{position:absolute;right:15px;bottom:15px}img{width:80px;height:80px}</style></head>
  <body><img alt="" src="https://gravatar.com/card-fixture.svg"><a href="https://gravatar.com/oomia6">View profile</a></body></html>`;

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
}

// Deterministic layout stress; these fixtures do not establish provider availability.
async function mockProviders(page: Page, failedHost?: string) {
  await page.route(gravatarUrl, (route) =>
    route.fulfill({ contentType: "text/html", body: gravatarFixture })
  );
  await page.route("https://gravatar.com/card-fixture.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"/>',
    })
  );
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
  "editorial homepage keeps discovery primary, contacts and shared theme",
  { tag: "@compat" },
  async ({ page }) => {
    await mockProviders(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/`);
    await expect(page.locator("#homepage h1")).toHaveText(
      /Ideas into\s*systems\./
    );
    await expect(page.locator(".home-profile-intro")).toHaveText(
      "구조를 고민하고, 작게 실험하며, 오래 쓸 수 있는 소프트웨어를 만듭니다."
    );
    await expect(page).toHaveTitle("ooMia — 개발 기록과 실험");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /ooMia/
    );
    const recent = page.getByRole("heading", { name: "최근 글", exact: true });
    await expect(recent).toBeVisible();
    expect(
      await recent.evaluate((el) =>
        Boolean(
          el.compareDocumentPosition(
            document.getElementById("profile-activity")!
          ) & Node.DOCUMENT_POSITION_FOLLOWING
        )
      )
    ).toBe(true);
    const contacts = page.getByRole("navigation", { name: "연락처" });
    for (const [name, href] of [
      ["GitHub", "https://github.com/ooMia"],
      ["LinkedIn", "https://www.linkedin.com/in/김현학/"],
      ["이메일 보내기", "mailto:dev@oomia.click"],
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

test("Gravatar official card defers its document and images until nearby", async ({
  page,
}) => {
  await mockProviders(page);
  // Native lazy loading is allowed to start within the browser's preload
  // margin. At this narrow viewport the real homepage places Activity well
  // below that margin; a short desktop layout may legitimately load earlier.
  await page.setViewportSize({ width: 320, height: 844 });
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://gravatar.com/"))
      requests.push(request.url());
  });
  await page.goto(`${base}/`);
  await page.waitForLoadState("networkidle");

  const frame = page.getByTitle("gravatar card");
  await expect(frame).toHaveAttribute("src", gravatarUrl);
  await expect(frame).toHaveAttribute("loading", "lazy");
  await expect(frame).not.toHaveAttribute("srcdoc");
  const reserved = await frame.locator("..").boundingBox();
  expect(reserved!.height).toBeGreaterThan(0);
  expect(reserved!.y).toBeGreaterThan(844 + 3000);
  expect(requests).toEqual([]);

  await frame.scrollIntoViewIfNeeded();
  const profile = page
    .frameLocator('iframe[title="gravatar card"]')
    .getByRole("link", { name: "View profile" });
  await expect(profile).toBeVisible();
  expect(requests).toContain(gravatarUrl);
  expect(requests).toContain("https://gravatar.com/card-fixture.svg");
  const loaded = await frame.locator("..").boundingBox();
  expect(loaded!.height).toBeCloseTo(reserved!.height, 1);
  await noOverflow(page);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect.poll(async () => (await frame.boundingBox())!.width).toBe(351);
  await page.setViewportSize({ width: 320, height: 844 });
  await frame.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => (await frame.boundingBox())!.width)
    .toBeLessThanOrEqual(320);
  const frameBox = await frame.boundingBox();
  const linkBox = await profile.boundingBox();
  expect(linkBox!.x).toBeGreaterThanOrEqual(frameBox!.x);
  expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(
    frameBox!.x + frameBox!.width + 1
  );
  expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(
    frameBox!.y + frameBox!.height + 1
  );
  const geometry = await frame.evaluate((element) => ({
    width: Number((element as HTMLIFrameElement).width),
    height: Number((element as HTMLIFrameElement).height),
  }));
  expect(frameBox!.height / frameBox!.width).toBeCloseTo(
    geometry.height / geometry.width,
    2
  );
  await noOverflow(page);
});

test("Gravatar profile remains reachable without site JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 844 },
  });
  try {
    const page = await context.newPage();
    await mockProviders(page);
    await page.goto(`${base}/`);
    const profile = page
      .locator(activitySelector)
      .getByRole("link", { name: "Gravatar profile", exact: true });
    await expect(profile).toHaveAttribute(
      "href",
      "https://gravatar.com/oomia6"
    );
    await profile.scrollIntoViewIfNeeded();
    await expect(profile).toBeVisible();
    await expect(page.getByTitle("gravatar card")).toHaveAttribute(
      "src",
      gravatarUrl
    );
    await noOverflow(page);
  } finally {
    await context.close();
  }
});

test("email keyboard activation", async ({ page }) => {
  await mockProviders(page);
  await page.goto(`${base}/`);
  const contacts = page.getByRole("navigation", { name: "연락처" });
  // Verify activation without leaving the test or opening the OS mail client.
  await contacts.evaluate((el) =>
    el.addEventListener("click", (event) => {
      event.preventDefault();
      const target =
        event.target instanceof Element ? event.target.closest("a") : null;
      el.setAttribute("data-activated", target?.getAttribute("href") ?? "");
    })
  );
  await contacts
    .getByRole("link", { name: "이메일 보내기", exact: true })
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
    .locator(".home-featured-copy, .home-story-copy")
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        href: node.querySelector(".home-story-title a")!.getAttribute("href")!,
        title: node.querySelector(".home-story-title")!.textContent!.trim(),
        description: node
          .querySelector(".home-story-description")!
          .textContent!.trim(),
        date: node.querySelector("time")?.getAttribute("datetime"),
        reading: Number(
          node.textContent!.match(/(\d+)\s*(?:min read|분 읽기)/)![1]
        ),
        tags: [
          ...new Set(
            Array.from(
              node.querySelectorAll<HTMLAnchorElement>('a[href*="?tag="]')
            ).map((link) => new URL(link.href).searchParams.get("tag"))
          ),
        ],
      }))
    );
  expect(entries.length).toBeGreaterThan(0);
  const builtArticles = (
    await readdir("dist/articles", { recursive: true })
  ).filter((file) => file.endsWith("index.html"));
  expect(new Set(entries.map((entry) => entry.href)).size).toBe(
    builtArticles.length
  );
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
    await expect(header.locator(".article-description")).toHaveText(
      entry.description
    );
    expect(
      Number(
        (await header.textContent())!.match(/(\d+)\s*(?:min read|분 읽기)/)![1]
      )
    ).toBe(entry.reading);
    if (entry.date)
      await expect(header.locator("time").first()).toHaveAttribute(
        "datetime",
        entry.date
      );
    const tags = await header
      .locator('a[href*="?tag="]')
      .evaluateAll((links) => [
        ...new Set(
          links.map((link) =>
            new URL((link as HTMLAnchorElement).href).searchParams.get("tag")
          )
        ),
      ]);
    expect(tags).toEqual(entry.tags);
  }
});

test(
  "shared tag URLs survive reload and image links open the article",
  { tag: "@compat" },
  async ({ page }) => {
    await mockProviders(page);
    await page.goto(`${base}/?tag=%20java%20#recent-articles`);
    await expect(
      page.getByRole("heading", { name: "#JAVA", exact: true })
    ).toBeVisible();
    const picker = page.locator(".home-tag-picker");
    const summary = picker.locator("summary");
    await summary.press("ArrowDown");
    const options = picker
      .getByRole("group", { name: "태그별 글 모아보기", exact: true })
      .getByRole("button");
    await expect(options.first()).toBeFocused();
    await options.first().press("End");
    await expect(options.last()).toBeFocused();
    await options.last().press("Escape");
    await expect(summary).toBeFocused();
    await expect(picker).not.toHaveAttribute("open", "");
    await summary.press("Enter");
    const java = picker.getByRole("button", { name: /^#JAVA\s*\(\d+\)$/ });
    const expected = Number((await java.textContent())!.match(/\((\d+)\)/)![1]);
    await java.click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("tag"))
      .toBe("JAVA");
    await expect(
      page.locator(articlesSelector).getByRole("heading", { level: 3 })
    ).toHaveCount(expected);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "#JAVA", exact: true })
    ).toBeVisible();
    await expect(
      page.locator(articlesSelector).getByRole("heading", { level: 3 })
    ).toHaveCount(expected);
    const first = page.locator(".home-story").first();
    const href = await first
      .getByRole("heading", { level: 3 })
      .getByRole("link")
      .getAttribute("href");
    const cover = first.locator(".home-cover");
    await expect(cover).toHaveAttribute("href", href!);
    await cover.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(href);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("article header h1")).not.toBeEmpty();
  }
);

test(
  "locale navigation opens the same article and returns to its original",
  { tag: "@compat" },
  async ({ page }) => {
    await mockProviders(page);
    await page.goto(`${base}/`);
    const originalTitle = await page.locator(".home-featured h2").textContent();
    const originalUrl = await page
      .locator(".home-featured h2 a")
      .getAttribute("href");
    await page
      .getByRole("link", { name: "Switch to English", exact: true })
      .press("Enter");
    await expect.poll(() => new URL(page.url()).pathname).toBe(`${base}/en/`);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(".home-language-notice")).toContainText(
      /English translations/i
    );
    const title = page.locator(".home-featured h2");
    const language = await title.getAttribute("lang");
    expect(["ko", "en"]).toContain(language);
    const localizedTitle = await title.textContent();
    const cover = page.locator(".home-featured .home-cover");
    await expect(cover).toHaveAttribute("lang", language!);
    await expect(cover).toHaveAttribute(
      "href",
      originalUrl!.replace(`${base}/articles/`, `${base}/en/articles/`)
    );
    await cover.click();
    await expect(page.locator("article header h1")).toHaveText(localizedTitle!);
    await expect(page.locator("[data-reading-body]")).toHaveAttribute(
      "lang",
      language!
    );
    await expect(page.locator(".article-translation-notice")).toContainText(
      /AI-translated|English translation is not available/
    );
    await page
      .getByRole("link", { name: "View original", exact: true })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(originalUrl);
    await expect(page.locator("html")).toHaveAttribute("lang", "ko-KR");
    await expect(page.locator("article header h1")).toHaveText(originalTitle!);
  }
);

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
      ).toHaveCount(4);
      expect(
        await page.locator(`${articlesSelector} h3`).allTextContents()
      ).toEqual(titles);
      await noOverflow(page);
      await page.locator(`${articlesSelector} h3 a`).first().click();
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
