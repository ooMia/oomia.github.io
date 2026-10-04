import { describe, expect, test } from "vite-plus/test";

import { compareArticleOrder, isArticleVisible } from "./article-policy";

describe("article visibility", () => {
  test("keeps drafts visible until filtering is explicitly enabled", () => {
    expect(isArticleVisible(true, false)).toBe(true);
    expect(isArticleVisible(false, false)).toBe(true);
    expect(isArticleVisible(undefined, false)).toBe(true);
  });

  test("excludes only explicit drafts when filtering is enabled", () => {
    expect(isArticleVisible(true, true)).toBe(false);
    expect(isArticleVisible(false, true)).toBe(true);
    expect(isArticleVisible(undefined, true)).toBe(true);
  });
});

describe("article ordering", () => {
  test("sorts published dates descending", () => {
    const newer = {
      id: "newer",
      publishedAt: new Date("2026-01-02T00:00:00Z"),
    };
    const older = {
      id: "older",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
    };

    expect(compareArticleOrder(newer, older)).toBeLessThan(0);
    expect(compareArticleOrder(older, newer)).toBeGreaterThan(0);
  });

  test("puts missing dates last and uses id as a stable tie-break", () => {
    const dated = {
      id: "z",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
    };
    const missing = { id: "a" };

    expect(compareArticleOrder(dated, missing)).toBeLessThan(0);
    expect(compareArticleOrder(missing, dated)).toBeGreaterThan(0);
    expect(compareArticleOrder({ id: "a" }, { id: "b" })).toBeLessThan(0);
  });
});
