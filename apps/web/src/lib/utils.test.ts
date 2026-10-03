import { describe, expect, test } from "vite-plus/test";

import { withBasePath } from "./utils";

describe("withBasePath", () => {
  test("keeps root-base paths root-relative", () => {
    expect(withBasePath("/articles/tech/java/map/", "/")).toBe(
      "/articles/tech/java/map/"
    );
  });

  test("prefixes non-root base paths exactly once", () => {
    expect(
      withBasePath("/articles/tech/java/map/", "/presentation-check/")
    ).toBe("/presentation-check/articles/tech/java/map/");
  });

  test("normalizes paths without a leading slash", () => {
    expect(withBasePath("articles/tech/java/map/", "/")).toBe(
      "/articles/tech/java/map/"
    );
  });
});
