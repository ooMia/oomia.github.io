import type { Nodes, Root } from "mdast";

import type { ReadingStatistics } from "./types";

import getReadingTime from "./lib";

/** Native Astro remark data adapter; shares the existing language/counting policy. */
export default function remarkReadingTime() {
  return (
    root: Root,
    file: { data: { astro?: { frontmatter?: Record<string, unknown> } } }
  ) => {
    const frontmatter = file.data.astro?.frontmatter;
    if (!frontmatter) return;
    let statistics: ReadingStatistics = { words: { en: 0, ko: 0 }, minutes: 0 };
    function walk(node: Nodes) {
      if (node.type === "text")
        statistics = getReadingTime(statistics, node.value);
      if ("children" in node) node.children.forEach(walk);
    }
    walk(root);
    frontmatter["readingTime"] = statistics;
  };
}
