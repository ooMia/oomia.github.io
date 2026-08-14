import { defineMdastPlugin } from "satteri";
import type { Text } from "mdast";
import { mergeWith } from "es-toolkit";
import type { ReadingStatistics } from "./types";
import getReadingTime from "./lib";
import type { AstroFileData } from "#plugins/types";
import type { MdastVisitorFn } from "#plugins/mdast/types";

const READING_STATISTICS = {
  words: {
    en: 0,
    ko: 0,
  },
  minutes: 0,
} satisfies ReadingStatistics;

const text: MdastVisitorFn<Text> = (tree, ctx) => {
  const { frontmatter } = ctx.data.astro as AstroFileData;

  mergeWith(READING_STATISTICS, getReadingTime(tree.value), (targetValue, sourceValue) => {
    if (typeof targetValue === "number" && typeof sourceValue === "number") {
      return targetValue + sourceValue;
    }
    return undefined;
  });

  frontmatter.readingTime = READING_STATISTICS;
};

export default defineMdastPlugin({ name: "reading-time", text });
