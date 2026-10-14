import { describe, expect, it } from "vite-plus/test";

import {
  documentLanguage,
  languageSwitchUrl,
  localeDate,
  localizedArticleUrl,
  localizedHomeUrl,
} from "./locale";

describe("locale URLs", () => {
  it("preserves Korean public paths and scopes English under the configured base", () => {
    expect(localizedHomeUrl("ko")).toBe("/");
    expect(localizedHomeUrl("en", "/blog/")).toBe("/blog/en/");
    expect(localizedArticleUrl("tech/log/example", "ko", "/blog/")).toBe(
      "/blog/articles/tech/log/example/"
    );
    expect(localizedArticleUrl("tech/log/example", "en", "/blog/")).toBe(
      "/blog/en/articles/tech/log/example/"
    );
    expect(localizedArticleUrl("기록/한글 #글?", "en")).toBe(
      "/en/articles/%EA%B8%B0%EB%A1%9D/%ED%95%9C%EA%B8%80%20%23%EA%B8%80%3F/"
    );
  });

  it("changes only the locale segment, including non-root deployments", () => {
    expect(
      languageSwitchUrl("/blog/articles/tech/log/example/", "en", "/blog/")
    ).toBe("/blog/en/articles/tech/log/example/");
    expect(
      languageSwitchUrl("/blog/en/articles/tech/log/example/", "ko", "/blog/")
    ).toBe("/blog/articles/tech/log/example/");
    expect(languageSwitchUrl("/blog/en/", "ko", "/blog/")).toBe("/blog/");
    expect(languageSwitchUrl("/blog/", "en", "/blog/")).toBe("/blog/en/");
    expect(languageSwitchUrl("/blog/en/articles/one/", "en", "/blog/")).toBe(
      "/blog/en/articles/one/"
    );
    expect(() => languageSwitchUrl("/blog-extra/en/", "ko", "/blog/")).toThrow(
      "outside"
    );
    expect(() => localizedArticleUrl("../example", "en")).toThrow("identity");
  });

  it("exposes language-aware document and date values", () => {
    expect(documentLanguage("ko")).toBe("ko-KR");
    expect(documentLanguage("en")).toBe("en");
    expect(localeDate(undefined, "en")).toBeUndefined();
    expect(localeDate("2026-10-13T00:00:00Z", "en")).toBe("Oct 13, 2026");
    expect(localeDate("2026-10-13T00:00:00Z", "ko")).toBe("2026. 10. 13.");
  });
});
