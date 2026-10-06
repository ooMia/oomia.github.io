export { default as mdx } from "@astrojs/mdx";
export { unified } from "@astrojs/markdown-remark";
export { default as remarkReadingTime } from "./plugins/mdast/reading-time/remark";
export { satteri } from "@astrojs/markdown-satteri";
export { default as linkCard } from "./plugins/hast/link-card";
export type { StandaloneLinkTarget } from "./plugins/hast/link-card";
export { default as readingTime } from "./plugins/mdast/reading-time";
export { default as externalLink } from "./plugins/mdast/external-link";
export {
  externalHttpUrl,
  normalizeExternalLinkCandidate,
  standaloneLinkContent,
} from "./plugins/mdast/external-link/normalize";
export { default as schema } from "./plugins/schema";

export type {
  AstroFileData,
  Frontmatter,
  HastPluginEntry,
  MdastPluginEntry,
} from "./plugins/types";
