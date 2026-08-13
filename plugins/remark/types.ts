import type { DataMap, VFile } from "vfile";
import type { DataEntryMap, render } from "astro:content";
import { z } from "astro/zod";
import type { RemarkPlugin } from "@astrojs/markdown-remark";
import schema from "./schema";

// plugin
export type Frontmatter = z.infer<typeof schema>;
export interface AstroFileData extends DataMap {
  astro: {
    frontmatter: Frontmatter;
  };
}
export type PluginFactory = RemarkPlugin<[import("mdast").Root, VFile]>;

// remark:render (wrapper)
export type DataEntry = DataEntryMap[keyof DataEntryMap][any];
export type RenderResult = Omit<Awaited<ReturnType<typeof render>>, "remarkPluginFrontmatter"> & {
  remarkPluginFrontmatter: Frontmatter;
};
