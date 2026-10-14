import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

import { readArticleTranslations } from "./lib/content/article-translations";

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

// Only verified, optional Docs artifacts enter the native Markdown/MDX pipeline.
const articleTranslations = defineCollection({
  loader: {
    name: "verified-article-translations",
    async load(context) {
      const translations = readArticleTranslations();
      if (translations.length === 0) {
        context.store.clear();
        return;
      }
      const records = new Map(
        translations.map((translation) => [
          translation.translationPath,
          translation,
        ]),
      );
      await glob({
        pattern: [...records.keys()],
        base: "./data/articles",
        generateId({ entry }) {
          const record = records.get(entry.replaceAll("\\", "/"));
          if (!record)
            throw new Error("Unverified translation collection entry");
          return record.collectionId;
        },
      }).load(context);
      for (const translation of translations) {
        const entry = context.store.get(translation.collectionId);
        if (!entry)
          throw new Error("Verified translation was not loaded natively");
        // Runtime routes receive a DTO, never a parser/fs/Git validator import.
        // Manifest provenance overwrites any same-named, untrusted frontmatter.
        const data = {
          title: entry.data["title"],
          description: entry.data["description"],
          sourcePath: translation.sourcePath,
          sourceSha256: translation.sourceSha256,
          translationSha256: translation.translationSha256,
          originalDocsRevision: translation.originalDocsRevision,
        };
        if (JSON.stringify(entry.data) !== JSON.stringify(data)) {
          // set() short-circuits matching digests. Replace metadata through the
          // public store API while retaining native rendering and its digest.
          context.store.delete(entry.id);
          context.store.set({ ...entry, data });
        }
      }
    },
  },
  // Only translated title/description are used; original metadata owns identity.
  schema: z.looseObject({
    title: z.string().min(1),
    description: z.string(),
    sourcePath: z.string().optional(),
    sourceSha256: z.string().optional(),
    translationSha256: z.string().optional(),
    originalDocsRevision: z.string().optional(),
  }),
});

export const collections = { articles, articleTranslations };
