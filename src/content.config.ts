import { defineCollection, reference } from "astro:content";
import { z } from "astro/zod";
import { file, glob } from "astro/loaders";

const articles = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./data/articles",
  }),
  schema: z.looseObject({
    title: z.string(),
    description: z.string(),
    draft: z.boolean().optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    author: reference("author"),
  }),
});

const author = defineCollection({
  loader: file("./data/author.json"),
  schema: z.looseObject({
    name: z.string(),
    portfolio: z.url().optional(),
  }),
});

export const collections = { articles, author };
