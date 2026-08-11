import type { Nodes } from "mdast";
import { toString } from "mdast-util-to-string";
import getReadingTime from "reading-time";
import type { DataMap, VFile } from "vfile";

export function remarkReadingTime() {
  return (tree: Nodes, file: VFile) => {
    const { astro } = file.data as DataMap;
    const { text: minutesRead } = getReadingTime(toString(tree));
    astro.frontmatter!["minutesRead"] = minutesRead;
  };
}
