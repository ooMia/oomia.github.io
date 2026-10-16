import type { CollectionEntry } from "astro:content";

import { getCollection } from "astro:content";
import { FILTER_DRAFT_ARTICLES } from "astro:env/server";

import { draftFilterEnabled } from "../../config/environment";
import { readArticleGitHistory } from "./article-history";
import { type ArticleMetadata, mapArticleMetadata } from "./article-metadata";
import { compareArticleMetadata, isArticleVisible } from "./article-policy";

export interface ArticleRecord {
  readonly entry: CollectionEntry<"articles">;
  readonly metadata: ArticleMetadata;
}

export function toArticleRecord(
  entry: CollectionEntry<"articles">
): ArticleRecord {
  return {
    entry,
    metadata: mapArticleMetadata(
      entry.id,
      entry.data,
      readArticleGitHistory(entry.filePath)
    ),
  };
}

export async function getArticleRecords({
  filterDraft = draftFilterEnabled(FILTER_DRAFT_ARTICLES),
}: {
  filterDraft?: boolean;
} = {}): Promise<ArticleRecord[]> {
  const entries = await getCollection("articles", ({ data }) =>
    isArticleVisible(data.draft, filterDraft)
  );

  return entries
    .map(toArticleRecord)
    .sort((a, b) => compareArticleMetadata(a.metadata, b.metadata));
}
