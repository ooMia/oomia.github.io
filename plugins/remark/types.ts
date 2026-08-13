import type { DataMap, VFile } from "vfile";
import type { DataEntryMap, render } from "astro:content";
import { z } from "astro/zod";
import type { RemarkPlugin } from "@astrojs/markdown-remark";

// plugin
export const remarkFrontmatterSchema = z
  .object({
    minutesRead: z.string(),
  })
  .catchall(z.unknown());
export type Frontmatter = z.infer<typeof remarkFrontmatterSchema>;
export interface AstroFileData extends DataMap {
  astro: {
    frontmatter: Frontmatter;
  };
}
export type PluginFactory = RemarkPlugin<[Node, VFile]>;

// remark:render (wrapper)
export type DataEntry = DataEntryMap[keyof DataEntryMap][any];
export type RenderResult = Omit<Awaited<ReturnType<typeof render>>, "remarkPluginFrontmatter"> & {
  remarkPluginFrontmatter: Frontmatter;
};
