import { expect, test } from "@playwright/test";

const base = (process.env["PRESENTATION_BASE"] ?? "").replace(/\/$/, "");

test("production CSP permits the application and rejects injected inline scripts", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /Content Security Policy|script-src|style-src/.test(message.text())
    )
      violations.push(message.text());
  });
  await page.goto(`${base}/`);
  const meta = page.locator('meta[http-equiv="content-security-policy"]');
  const policy = await meta.getAttribute("content");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("base-uri 'self'");
  expect(policy).toContain("script-src-attr 'none'");
  expect(policy).toContain("style-src-attr 'unsafe-inline'");
  expect(policy?.match(/script-src[^;]*/)?.[0]).not.toMatch(
    /unsafe-inline|unsafe-eval/
  );
  await page.getByRole("button", { name: "Toggle Theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.locator(".home-featured h2 a").click();
  await expect(page.locator(".article-body")).toBeVisible();
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  // Native MDX can render external iframe elements; CSP must preserve that
  // existing content capability, not silently restrict embeds to Gravatar.
  await page.route("https://iframe.example.test/native-embed", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><p>Native external embed</p>",
    })
  );
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.title = "Native MDX embed fixture";
    frame.src = "https://iframe.example.test/native-embed";
    document.querySelector(".article-body")!.append(frame);
  });
  await expect(
    page
      .frameLocator('iframe[title="Native MDX embed fixture"]')
      .getByText("Native external embed")
  ).toBeVisible();
  expect(violations).toEqual([]);
  await page.evaluate(() => {
    const script = document.createElement("script");
    script.textContent =
      "document.documentElement.dataset.cspInjected = 'executed';";
    document.body.append(script);
  });
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-csp-injected",
    "executed"
  );
  await expect.poll(() => violations.length).toBeGreaterThan(0);
});
