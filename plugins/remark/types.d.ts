import type { DataMap, VFile } from "vfile";
import { z } from "astro/zod";
import type { RemarkPlugin } from "@astrojs/markdown-remark";

// plugin spec
const remarkFrontmatterSchema = z
  .object({
    minutesRead: z.string(),
  })
  .catchall(z.unknown());
type Frontmatter = z.infer<typeof remarkFrontmatterSchema>;
type PluginFactory = RemarkPlugin<[Node, VFile]>;
interface AstroFileData extends DataMap {
  astro: {
    frontmatter: Frontmatter;
  };
}

// remark:render (wrapper)
type DataEntry = DataEntryMap[keyof DataEntryMap][any];
type AstroRender = typeof import("astro:content").render;
type RenderResult = Omit<Awaited<ReturnType<AstroRender>>, "remarkPluginFrontmatter"> & {
  remarkPluginFrontmatter: Frontmatter;
};
