import { expect, test } from "@playwright/test";

const base = (process.env["PRESENTATION_BASE"] ?? "").replace(/\/$/, "");

for (const locale of ["ko", "en"] as const) {
  test(`${locale} Home keeps prose fonts off its loading path and prioritizes its cover`, async ({
    page,
  }) => {
    await page.goto(`${base}/${locale === "en" ? "en/" : ""}`);
    await page.evaluate(() => document.fonts.ready);
    const families = await page.evaluate(() =>
      [...document.fonts].map((font) => font.family.replaceAll(/["']/g, "")),
    );
    expect(families).toContain("Workshop Display");
    expect(families.some((name) => /Gowun|Literata|Geist/.test(name))).toBe(
      false,
    );
    const preload = page.locator('link[rel="preload"][as="font"]');
    await expect(preload).toHaveCount(1);
    await expect(preload).toHaveAttribute(
      "href",
      /space-grotesk-latin.*\.woff2$/,
    );
    await expect(preload).toHaveAttribute("crossorigin", "anonymous");

    const cover = page.locator(".home-featured .home-cover img");
    await expect(cover).toHaveAttribute("loading", "eager");
    await expect(cover).toHaveAttribute("fetchpriority", "high");
    await expect(cover).toHaveAttribute("width", "400");
    await expect(cover).toHaveAttribute("height", "260");
    for (const image of await page
      .locator(".home-story .home-cover img")
      .all()) {
      await expect(image).toHaveAttribute("loading", "lazy");
      await expect(image).not.toHaveAttribute("fetchpriority", "high");
    }

    const articleUrl = await page
      .locator(".home-featured .home-cover")
      .getAttribute("href");
    await page.goto(articleUrl!);
    await page.evaluate(() => document.fonts.ready);
    const articleFamilies = await page.evaluate(() =>
      [...document.fonts].map((font) => font.family.replaceAll(/["']/g, "")),
    );
    expect(articleFamilies).toContain("Gowun Batang");
    expect(articleFamilies).toContain("Literata Variable");
    expect(articleFamilies).not.toContain("Workshop Display");
    await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(0);
    const decoration = page.locator(".article-hero-art img");
    await expect(decoration).toHaveAttribute("loading", "lazy");
  });

  test(`${locale} tag and framework links describe their different destinations`, async ({
    page,
  }) => {
    await page.goto(`${base}/${locale === "en" ? "en/" : ""}`);
    const tagLinks = page.locator(".tag-collection a:visible");
    expect(await tagLinks.count()).toBeGreaterThan(0);
    for (const link of await tagLinks.all()) {
      const tag = (await link.textContent())!.replace(/^#/, "").trim();
      await expect(link).toHaveAccessibleName(
        locale === "en"
          ? `Browse articles tagged ${tag}`
          : `${tag} 태그 글 모아보기`,
      );
    }
    for (const [name, href] of [
      ["Astro", "https://astro.build/"],
      ["Fumadocs", "https://fumadocs.dev/"],
    ] as const) {
      await expect(
        page.getByRole("link", {
          name:
            locale === "en"
              ? `${name} official website`
              : `${name} 공식 사이트`,
          exact: true,
        }),
      ).toHaveAttribute("href", href);
    }
  });
}

test("tag fitting remeasures folded tags on resize and retains overflow keyboard access", async ({
  page,
}) => {
  await page.goto(`${base}/`);
  await page.evaluate(() => document.fonts.ready);
  const collection = page.locator(".tag-collection").first();
  const railLinks = collection.locator(".tags a:visible");
  const allTags = await collection.locator(".tag-overflow a").count();
  expect(allTags).toBeGreaterThan(1);
  await collection.evaluate((el) => (el.style.width = "60px"));
  await expect.poll(() => railLinks.count()).toBeLessThan(allTags);
  const foldedCount = await railLinks.count();
  const more = collection.getByRole("button", { name: /태그 .*개 모두 보기/ });
  await expect(more).toBeVisible();
  await more.press("Enter");
  const overflow = collection.getByRole("group", { name: "모든 태그" });
  await expect(overflow.getByRole("link")).toHaveCount(allTags);
  await expect(overflow.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  await expect(overflow).toBeHidden();
  await collection.evaluate((el) => (el.style.width = "100%"));
  await expect.poll(() => railLinks.count()).toBeGreaterThan(foldedCount);
});
