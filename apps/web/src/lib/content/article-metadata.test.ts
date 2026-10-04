import { describe, expect, test } from "vite-plus/test";

import {
  mapArticleMetadata,
  resolveArticleAuthor,
  resolveArticleDates,
  SITE_AUTHOR,
} from "./article-metadata";

const firstAuthorDate = new Date("2026-09-01T00:00:00+09:00");
const lastAuthorDate = new Date("2026-10-01T00:00:00+09:00");

describe("article metadata", () => {
  test("explicit dates win over Git history", () => {
    const date = new Date("2025-12-01T00:00:00+09:00");
    const updatedDate = new Date("2026-01-03T00:00:00+09:00");

    expect(
      resolveArticleDates(
        { date, updatedDate },
        { firstAuthorDate, lastAuthorDate },
      ),
    ).toEqual({
      publishedAt: date,
      updatedAt: updatedDate,
    });
  });

  test("Git history fills missing dates without manufacturing values", () => {
    expect(
      resolveArticleDates({}, { firstAuthorDate, lastAuthorDate }),
    ).toEqual({
      publishedAt: firstAuthorDate,
      updatedAt: lastAuthorDate,
    });
    expect(resolveArticleDates({})).toEqual({
      publishedAt: undefined,
      updatedAt: undefined,
    });
  });

  test("maps canonical author casing to one Site identity", () => {
    expect(resolveArticleAuthor("oomia")).toBe(SITE_AUTHOR);
    expect(resolveArticleAuthor("ooMia")).toBe(SITE_AUTHOR);
    expect(() => resolveArticleAuthor("another-author")).toThrow(
      /Unsupported article author/,
    );
  });

  test("preserves authored tags and aliases", () => {
    const metadata = mapArticleMetadata("tech/java/pattern", {
      title: "Pattern",
      description: "Regex pattern",
      author: "oomia",
      tags: ["java", "IntelliJ", "regex"],
      aliases: ["java.util.regex.Pattern"],
      draft: true,
      date: new Date("2025-12-01T00:00:00+09:00"),
    });

    expect(metadata.author.handle).toBe("ooMia");
    expect(metadata.tags).toEqual(["java", "IntelliJ", "regex"]);
    expect(metadata.aliases).toEqual(["java.util.regex.Pattern"]);
    expect(metadata.draft).toBe(true);
  });
});
