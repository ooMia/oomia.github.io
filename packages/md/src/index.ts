export { default as mdx } from "@astrojs/mdx"
export { satteri } from "@astrojs/markdown-satteri"
export { default as readingTime } from "./plugins/mdast/reading-time"
export { default as schema } from "./plugins/schema"

export type {
  AstroFileData,
  Frontmatter,
  MdastPluginEntry,
} from "./plugins/types"
