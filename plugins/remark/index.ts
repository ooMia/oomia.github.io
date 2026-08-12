import { remarkFrontmatterSchema as schema, type DataEntry, type RenderResult } from "./types";
import type { RemarkPlugins } from "@astrojs/markdown-remark";
import { remarkReadingTime } from "./reading-time";

export async function render(entry: DataEntry): Promise<RenderResult> {
  const { render: astroRender } = await import("astro:content");
  const result = await astroRender(entry);
  const remarkPluginFrontmatter = schema.parse(result.remarkPluginFrontmatter);
  return {
    ...result,
    remarkPluginFrontmatter,
  };
}

export const remarkPlugins = [remarkReadingTime] as unknown as RemarkPlugins;
