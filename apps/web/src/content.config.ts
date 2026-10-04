import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

const articles = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./data/articles/content/articles",
  }),
  schema: z.looseObject({
    title: z.string(),
    description: z.string(),
    author: reference("author"),
    tags: z.array(z.string()).optional(),
    aliases: z.array(z.string()).nullish(),
    date: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().optional(),
  }),
});

const author = defineCollection({
  loader: file("./data/author.json"),
  schema: z.looseObject({
    handle: z.string(),
    name: z.string(),
    profileUrl: z.url(),
    email: z.string().email(),
  }),
});

export const collections = { articles, author };
