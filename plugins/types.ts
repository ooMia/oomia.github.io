import type { DataEntryMap, render } from "astro:content";
import { z } from "astro/zod";
import type { SatteriAstroData } from "@astrojs/markdown-satteri";
import schema from "./schema";

// plugin
export type Frontmatter = z.infer<typeof schema>;
export interface AstroFileData extends Omit<SatteriAstroData, "frontmatter"> {
  frontmatter: Frontmatter;
}

// remark:render (wrapper)
export type DataEntry = DataEntryMap[keyof DataEntryMap][any];
export type RenderResult = Omit<Awaited<ReturnType<typeof render>>, "remarkPluginFrontmatter"> & {
  remarkPluginFrontmatter: Frontmatter;
};
