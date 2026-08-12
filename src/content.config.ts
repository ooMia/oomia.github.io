import { defineCollection, reference } from "astro:content";
import { z } from "astro/zod";
import { file, glob } from "astro/loaders";

const articles = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./data/articles",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    author: reference("author"),
  }),
});

const author = defineCollection({
  loader: file("./data/author.json"),
  schema: z.object({
    name: z.string(),
    portfolio: z.url().optional(),
  }),
});

export const collections = { articles, author };
