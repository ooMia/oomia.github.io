import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

const revision = execFileSync(
  "git",
  ["-C", "data/articles", "rev-parse", "HEAD"],
  { encoding: "utf8" }
).trim();
test("article exposes consistent description, canonical URL and actual Docs provenance", async ({
  page,
}) => {
  await page.goto("/articles/tech/log/publishing-platform-1/");
  const description = await page
    .locator('meta[name="description"]')
    .getAttribute("content");
  expect(description?.trim()).toBeTruthy();
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    description!
  );
  await expect(
    page.locator('meta[name="twitter:description"]')
  ).toHaveAttribute("content", description!);
  await expect(
    page.locator('meta[name="oomia:docs-revision"]')
  ).toHaveAttribute("content", revision);
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canonical).toBe(
    "https://oomia.github.io/articles/tech/log/publishing-platform-1/"
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    canonical!
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "article"
  );
  const structured = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "{}"
  );
  expect(structured.description).toBe(description);
  expect(structured.image).toBeUndefined();
});
