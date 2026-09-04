import {
  type SatteriAstroData,
  type SatteriProcessorOptions,
} from "@astrojs/markdown-satteri"
import { z } from "astro/zod"

import schema from "./schema"

type ElementType<T> = T extends readonly (infer U)[] ? U : never
export type MdastPluginEntry = ElementType<
  SatteriProcessorOptions["mdastPlugins"]
>

// plugin
export type Frontmatter = z.infer<typeof schema>
export interface AstroFileData extends Omit<SatteriAstroData, "frontmatter"> {
  frontmatter: Frontmatter
}
