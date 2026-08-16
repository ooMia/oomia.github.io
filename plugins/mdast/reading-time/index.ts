import { defineMdastPlugin } from "satteri";
import type { Text } from "mdast";
import getReadingTime from "./lib";
import type { AstroFileData } from "#plugins/types";
import type { MdastVisitorFn } from "#plugins/mdast/types";

export default defineMdastPlugin({
  name: "reading-time",
  text: ((tree, ctx) => {
    const { frontmatter } = ctx.data.astro as AstroFileData;
    frontmatter.readingTime = getReadingTime(frontmatter.readingTime, tree.value);
  }) satisfies MdastVisitorFn<Text>,
});
