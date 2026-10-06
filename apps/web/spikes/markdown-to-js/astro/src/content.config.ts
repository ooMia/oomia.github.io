import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";

export const collections = {
  fixtures: defineCollection({
    loader: glob({ pattern: "*.{md,mdx}", base: "./src/content" }),
  }),
  corpus: defineCollection({
    loader: glob({
      pattern: "**/*.{md,mdx}",
      base: "../../../data/articles/content/articles",
    }),
  }),
};
