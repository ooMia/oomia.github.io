import { describe, expect, it } from "vite-plus/test";

import { buildTagIndex, sortedTags, articleVisual } from "./articles";
describe("article presentation identity", () => {
  it("counts distinct article identities after compatibility normalization", () => {
    const index = buildTagIndex([
      { id: "a", tags: [" java ", "ＪＡＶＡ", "Map"] },
      { id: "a", tags: ["JAVA"] },
      { id: "b", tags: ["java", "map"] },
      { id: "c", tags: ["other"] },
    ]);
    expect(index.counts).toEqual({ JAVA: 2, MAP: 2, OTHER: 1 });
    expect(index.order).toEqual(["JAVA", "MAP", "OTHER"]);
    expect(sortedTags(["other", "map", "ＪＡＶＡ", "JAVA"], index)).toEqual([
      "JAVA",
      "MAP",
      "OTHER",
    ]);
  });
  it("keeps visual choices stable when listing order changes", () => {
    expect(
      articleVisual({ id: "tech/java/map", title: "SortedMap", tags: ["java"] })
        .kind
    ).toBe("flow");
    expect(
      articleVisual({ id: "new/article", title: "A `note`", tags: [] }).label
    ).toBe("A note");
  });
});
