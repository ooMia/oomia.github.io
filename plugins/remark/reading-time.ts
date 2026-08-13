import getReadingTime from "reading-time";
import { toString } from "mdast-util-to-string";
import type { AstroFileData, PluginFactory } from "./types";

export default function remarkReadingTime(): PluginFactory {
  return (tree, { data }) => {
    const { frontmatter } = data.astro as AstroFileData["astro"];
    const { text: minutesRead } = getReadingTime(toString(tree));
    frontmatter.minutesRead = minutesRead;
  };
}
