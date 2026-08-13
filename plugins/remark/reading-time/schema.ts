import { z } from "astro/zod";
import type { ReadingLanguage } from "./types";

export default z.object({
  content: z.string(),
  words: z.record(z.string<ReadingLanguage>(), z.number()),
  minutes: z.number(),
});
