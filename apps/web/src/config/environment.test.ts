import { describe, expect, it } from "vite-plus/test";

import { parseSiteEnvironment } from "./environment";

describe("Site environment input", () => {
  it("preserves URL alias, base normalization and literal draft opt-in semantics", () => {
    expect(parseSiteEnvironment({})).toMatchObject({
      siteUrl: "http://localhost:4321",
      basePath: "/",
      filterDraftArticles: false,
      docsCheckoutMode: "pinned",
    });
    expect(
      parseSiteEnvironment({
        SITE_URL: " https://example.test/ ",
        SITE: "https://ignored.test",
        BASE_PATH: "/nested/site/",
        FILTER_DRAFT_ARTICLES: "true",
      })
    ).toMatchObject({
      siteUrl: "https://example.test",
      basePath: "nested/site",
      filterDraftArticles: true,
    });
    expect(
      parseSiteEnvironment({
        SITE: "https://alias.test/",
        FILTER_DRAFT_ARTICLES: "TRUE",
      }).filterDraftArticles
    ).toBe(false);
    expect(
      parseSiteEnvironment({ SITE_URL: "", SITE: "https://alias.test" }).siteUrl
    ).toBe("http://localhost:4321");
  });

  it("rejects invalid URL/provenance inputs before content is loaded", () => {
    expect(() =>
      parseSiteEnvironment({ DOCS_REVISION: "f".repeat(40) })
    ).toThrow(/build-derived/);
    for (const SITE_URL of [
      "invalid",
      "file:///tmp/site",
      "https://user:pass@example.test",
    ])
      expect(() => parseSiteEnvironment({ SITE_URL })).toThrow();
    for (const DOCS_CHECKOUT_REVISION of [undefined, "main", "a".repeat(39)])
      expect(() =>
        parseSiteEnvironment({
          DOCS_CHECKOUT_MODE: "resolved",
          DOCS_CHECKOUT_REVISION,
        })
      ).toThrow(/full lowercase Git SHA/);
    expect(() => parseSiteEnvironment({ DOCS_CHECKOUT_MODE: "other" })).toThrow(
      /Unsupported/
    );
    expect(
      parseSiteEnvironment({
        DOCS_CHECKOUT_MODE: "resolved",
        DOCS_CHECKOUT_REVISION: "a".repeat(40),
      }).docsCheckoutRevision
    ).toBe("a".repeat(40));
  });
});
