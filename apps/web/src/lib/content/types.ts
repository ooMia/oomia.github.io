import type { Frontmatter } from "@workspace/md"
import type { DataEntryMap, render } from "astro:content"

export type DataEntry = DataEntryMap[keyof DataEntryMap][string]

export type RenderResult = Omit<
  Awaited<ReturnType<typeof render>>,
  "remarkPluginFrontmatter"
> & {
  remarkPluginFrontmatter: Frontmatter
}
