import { describe, expect, it } from "vite-plus/test";

import { mapArticleMetadata } from "./article-metadata";
import { articleSocial } from "./article-social";

describe("article social projection", () => {
  const article = mapArticleMetadata("tech/log/example", {
    title: "Article",
    description: "</script><script>source</script>",
    author: "oomia",
    tags: ["topic"],
  });
  it("projects one synopsis with canonical configured URLs and no fabricated optional values", () => {
    const social = articleSocial(
      article,
      "https://example.com",
      "/blog/",
      "a".repeat(40)
    );
    expect(social.url).toBe(
      "https://example.com/blog/articles/tech/log/example/"
    );
    expect(social.description).toBe(article.description);
    expect(social.image).toBeUndefined();
    expect(social.published).toBeUndefined();
    const json = JSON.parse(social.jsonLd);
    expect(json.description).toBe(article.description);
    expect(json.datePublished).toBeUndefined();
    expect(json.image).toBeUndefined();
    expect(social.jsonLd).not.toContain("</script>");
  });
  it("projects preview images independently from structured representative images", () => {
    const social = articleSocial(
      article,
      "https://example.com",
      "/",
      "a".repeat(40),
      "b".repeat(64)
    );
    expect(social.image).toBe(
      `https://example.com/social-previews/${"b".repeat(64)}.png`
    );
    expect(JSON.parse(social.jsonLd).image).toBeUndefined();
  });
});
