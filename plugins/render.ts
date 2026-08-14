import type { DataEntry, RenderResult } from "./types";
import schema from "./schema";

export default async function render(entry: DataEntry): Promise<RenderResult> {
  const { render: astroRender } = await import("astro:content");
  const result = await astroRender(entry);
  const remarkPluginFrontmatter = schema.parse(result.remarkPluginFrontmatter);
  return {
    ...result,
    remarkPluginFrontmatter,
  };
}
