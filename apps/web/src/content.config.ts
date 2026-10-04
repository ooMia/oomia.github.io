import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

const articles = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./data/articles/content/articles",
  }),
  schema: z.looseObject({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    tags: z.array(z.string()).optional(),
    aliases: z.array(z.string()).nullish(),
    date: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = { articles };
