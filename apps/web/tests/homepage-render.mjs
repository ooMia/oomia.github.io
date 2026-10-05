import { chromium } from "@playwright/test";
import { preview } from "astro";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const directory = resolve(
  process.env["PRESENTATION_EVIDENCE_DIR"] ?? "../../test-results/homepage"
);
await mkdir(directory, { recursive: true });
const server = await preview({
  server: { host: "127.0.0.1", port: 4321 },
  logLevel: "error",
});
const browser = await chromium.launch({
  channel: process.env["PLAYWRIGHT_CHANNEL"],
});
const reports = [];
try {
  for (const { name, viewport } of [
    { name: "desktop", viewport: { width: 1440, height: 1000 } },
    { name: "mobile", viewport: { width: 390, height: 844 } },
  ]) {
    const context = await browser.newContext({
      viewport,
      colorScheme: "light",
      isMobile: name === "mobile",
      hasTouch: name === "mobile",
    });
    const page = await context.newPage();
    await page.goto(
      `http://127.0.0.1:4321${process.env["PRESENTATION_BASE"] ?? ""}/`
    );
    await page.getByRole("button", { name: "Toggle Theme" }).waitFor();
    const activity = page.locator(
      'section[aria-labelledby="profile-activity"]'
    );
    for (const img of await activity.locator("img").all()) {
      await img.locator("..").scrollIntoViewIfNeeded();
      await img.evaluate(
        (el) =>
          new Promise((done) => {
            if (el.complete) return done();
            const timer = setTimeout(done, 8000);
            const finish = () => {
              clearTimeout(timer);
              done();
            };
            el.addEventListener("load", finish, { once: true });
            el.addEventListener("error", finish, { once: true });
          })
      );
    }
    const providers = await activity.locator("img").evaluateAll((images) =>
      images.map((img) => ({
        src: img.getAttribute("src"),
        loaded: img.complete && img.naturalWidth > 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
        hidden: img.hidden,
        fallbackVisible: !img.nextElementSibling.hidden,
      }))
    );
    const gravatar = await activity.locator("[data-gravatar-card]").evaluate(
      (card) => {
        const frame = card.querySelector("[data-gravatar-card-frame]");
        if (!(frame instanceof HTMLIFrameElement)) return null;

        const cardBox = card.getBoundingClientRect();
        const frameBox = frame.getBoundingClientRect();
        return {
          src: frame.getAttribute("src"),
          card: { width: cardBox.width, height: cardBox.height },
          frame: { width: frameBox.width, height: frameBox.height },
          outerFit:
            Math.abs(cardBox.width - frameBox.width) < 1 &&
            Math.abs(cardBox.height - frameBox.height) < 1,
          innerGeometryObservable: false,
        };
      }
    );
    for (const theme of ["light", "dark"]) {
      if (theme === "dark") {
        await page.getByRole("button", { name: "Toggle Theme" }).click();
        await page.locator("html.dark").waitFor();
      }
      // Provider SVGs can animate independently of the page's Web Animations API.
      await page.waitForTimeout(2000);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: resolve(directory, `${name}-${theme}.png`),
        fullPage: true,
      });
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      if (dimensions.document > dimensions.viewport)
        throw new Error(`${name}/${theme}: horizontal overflow`);
      reports.push({
        viewport: name,
        theme,
        dimensions,
        providers,
        gravatar,
      });
    }
    await context.close();
  }
  await writeFile(
    resolve(directory, "provider-status.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        revision: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        mocked: false,
        reports,
      },
      null,
      2
    ) + "\n"
  );
  console.log(JSON.stringify(reports));
} finally {
  await browser.close();
  await server.stop();
}
