import { schema } from "@workspace/md"
import { render as astroRender } from "astro:content"

import type { DataEntry, RenderResult } from "./types"

export default async function render(entry: DataEntry): Promise<RenderResult> {
  const result = await astroRender(entry)
  const remarkPluginFrontmatter = schema.parse(result.remarkPluginFrontmatter)

  return {
    ...result,
    remarkPluginFrontmatter,
  }
}
