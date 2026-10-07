import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

// Run against the same production component, browser and offline fixture server
// as navigation/fallback regression. Keep comparison data outside production.
export async function calibrate({ page, output, openFixture, applyTheme }) {
  const source = await readFile(
    new URL("./calibration-corpus.json", import.meta.url)
  );
  const corpus = JSON.parse(source);
  for (const topic of corpus.topics) {
    for (const budget of [18, 24, 30]) {
      const lines = topic.candidates[budget];
      assert.equal(lines.length, 3);
      for (const line of lines) assert.ok(Array.from(line).length <= budget);
    }
  }
  await openFixture(page, "calibration");
  assert.equal(await page.locator("a.link-card").count(), 18);
  for (const topic of corpus.topics) {
    for (const budget of [18, 24, 30]) {
      assert.deepEqual(
        await page
          .locator(
            `[data-calibration-topic="${topic.id}"][data-calibration-budget="${budget}"] .link-card__row`
          )
          .allTextContents(),
        topic.candidates[budget]
      );
    }
  }
  async function measure() {
    return page.locator("[data-calibration-budget]").evaluateAll((sections) =>
      sections.map((section) => {
        const card = section.querySelector(".link-card");
        const summary = section.querySelector(".link-card__summary");
        const box = summary.getBoundingClientRect();
        const style = getComputedStyle(summary);
        const rows = [...summary.querySelectorAll(".link-card__row")].map(
          (row) => {
            const range = document.createRange();
            range.selectNodeContents(row);
            const rects = [...range.getClientRects()];
            const rowStyle = getComputedStyle(row);
            return {
              text: row.textContent,
              display: rowStyle.display,
              lines: new Set(rects.map((rect) => Math.round(rect.top))).size,
              contained: rects.every(
                (rect) =>
                  rect.left >= box.left - 1 &&
                  rect.right <= box.right + 1 &&
                  rect.top >= box.top - 1 &&
                  rect.bottom <= box.bottom + 1
              ),
              overflow: rowStyle.overflow,
              textOverflow: rowStyle.textOverflow,
            };
          }
        );
        return {
          topic: section.dataset.calibrationTopic,
          budget: Number(section.dataset.calibrationBudget),
          cardHeight: card.getBoundingClientRect().height,
          summaryWidth: box.width,
          summaryHeight: box.height,
          visualLines: Math.round(
            box.height / Number.parseFloat(style.lineHeight)
          ),
          fontSize: style.fontSize,
          mode: style.display,
          contained: summary.scrollWidth <= summary.clientWidth + 1,
          overflow: style.overflow,
          textOverflow: style.textOverflow,
          rows,
        };
      })
    );
  }
  function check(measurements) {
    for (const item of measurements) {
      assert.ok(item.contained, JSON.stringify(item));
      assert.equal(item.fontSize, "14px");
      assert.equal(item.overflow, "visible");
      assert.notEqual(item.textOverflow, "ellipsis");
      for (const row of item.rows) {
        assert.ok(row.contained, JSON.stringify(item));
        assert.equal(row.overflow, "visible");
        assert.notEqual(row.textOverflow, "ellipsis");
      }
    }
  }
  const observations = [];
  for (const width of [320, 390, 575, 640, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await applyTheme(page, theme);
      const cards = await measure();
      check(cards);
      for (const card of cards) {
        if (width <= 390) {
          assert.equal(card.mode, "block");
          assert.ok(card.rows.every((row) => row.display === "inline"));
        } else if (width >= 768) {
          assert.equal(card.mode, "grid");
          assert.ok(
            card.rows.every((row) => row.display === "block" && row.lines === 1)
          );
        }
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      );
      observations.push({ width, theme, cards });
      if ([320, 390, 768, 1440].includes(width)) {
        await page
          .locator(".article-body")
          .screenshot({ path: `${output}/calibration-${width}-${theme}.png` });
      }
      if ([320, 1440].includes(width)) {
        for (const budget of [18, 24, 30]) {
          await page
            .locator(
              `[data-calibration-topic="terminal"][data-calibration-budget="${budget}"] .link-card`
            )
            .screenshot({
              path: `${output}/candidate-${budget}-${width}-${theme}.png`,
            });
        }
      }
    }
  }
  for (const cardWidth of [575, 576, 577]) {
    await page.locator(".link-card").evaluateAll(
      (cards, width) =>
        cards.forEach((card) => {
          card.style.boxSizing = "content-box";
          card.style.width = `${width}px`;
        }),
      cardWidth
    );
    const cards = await measure();
    check(cards);
    assert.ok(
      cards.every((card) => card.mode === (cardWidth < 576 ? "block" : "grid"))
    );
    observations.push({ width: 1440, cardContentWidth: cardWidth, cards });
  }
  await page
    .locator(".link-card")
    .evaluateAll((cards) =>
      cards.forEach((card) => card.removeAttribute("style"))
    );
  // A desktop viewport can still contain a narrow card. Exercise actual width.
  await page
    .locator("[data-calibration-budget]")
    .evaluateAll((sections) =>
      sections.forEach((section) => (section.style.width = "280px"))
    );
  const nested = await measure();
  check(nested);
  assert.ok(nested.every((card) => card.mode === "block"));
  observations.push({ width: 1440, cardContainerWidth: 280, cards: nested });
  // Out-of-budget output is preserved and wraps; no renderer-side shortening.
  const long = page.locator(".link-card__row").first();
  await long.evaluate((row) => (row.textContent = "W".repeat(160)));
  const overlong = (await measure())[0];
  check([overlong]);
  assert.equal(overlong.rows[0].text, "W".repeat(160));
  assert.ok(overlong.rows[0].lines > 1);
  await writeFile(
    `${output}/calibration.json`,
    JSON.stringify(
      {
        corpusSha256: createHash("sha256").update(source).digest("hex"),
        sourceRevision: corpus.sourceRevision,
        authorship: corpus.authorship,
        observations,
        overlong,
        result: "PASS",
      },
      null,
      2
    )
  );
  return {
    candidates: [18, 24, 30],
    topics: corpus.topics.length,
    observations: observations.length,
  };
}
