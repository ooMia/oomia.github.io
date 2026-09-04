import type { AstroFileData, MdastPluginEntry } from "../../types"

import getReadingTime from "./lib"

const readingTime: MdastPluginEntry = {
  name: "reading-time",
  text: (tree, ctx) => {
    const { frontmatter } = ctx.data.astro as AstroFileData
    frontmatter.readingTime = getReadingTime(
      frontmatter.readingTime,
      tree.value
    )
  },
}

export default readingTime
