import type { RemarkPlugins } from "@astrojs/markdown-remark";
import { remarkFrontmatterSchema as schema, type DataEntry, type RenderResult } from "./types";
import readingTime from "./reading-time";

export async function render(entry: DataEntry): Promise<RenderResult> {
  const { render: astroRender } = await import("astro:content");
  const result = await astroRender(entry);
  const remarkPluginFrontmatter = schema.parse(result.remarkPluginFrontmatter);
  return {
    ...result,
    remarkPluginFrontmatter,
  };
}

export default [readingTime] as unknown as RemarkPlugins;
