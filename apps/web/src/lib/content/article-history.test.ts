import { describe, expect, test } from "vite-plus/test";

import { toDocsRelativePath } from "./article-history";

describe("Docs article path mapping", () => {
  test("maps Astro project-relative filePath into the Docs repository", () => {
    expect(
      toDocsRelativePath(
        "data/articles/content/articles/tech/java/Pattern.md",
      ),
    ).toBe("content/articles/tech/java/Pattern.md");
  });

  test("rejects paths outside the pinned Docs repository", () => {
    expect(toDocsRelativePath("../outside.md")).toBeUndefined();
  });
});
