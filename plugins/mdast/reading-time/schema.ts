import { z } from "astro/zod";

const readingWordsSchema = z.object({
  en: z.number().nonnegative(),
  ko: z.number().nonnegative(),
});

const schema = z.object({
  words: readingWordsSchema,
  minutes: z.number().nonnegative(),
});

export default schema;
