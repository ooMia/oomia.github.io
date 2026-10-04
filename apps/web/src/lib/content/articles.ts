import type { CollectionEntry } from "astro:content";

import { getCollection } from "astro:content";

import {
  type ArticleMetadata,
  getArticleMetadata,
} from "./article-metadata";

export interface ArticleRecord {
  readonly entry: CollectionEntry<"articles">;
  readonly metadata: ArticleMetadata;
}

export function isArticleVisible(draft: boolean | undefined, filterDraft: boolean) {
  return !filterDraft || draft !== true;
}

export function compareArticleRecords(a: ArticleRecord, b: ArticleRecord) {
  const aDate = a.metadata.publishedAt?.getTime();
  const bDate = b.metadata.publishedAt?.getTime();

  if (aDate !== undefined && bDate === undefined) return -1;
  if (aDate === undefined && bDate !== undefined) return 1;
  if (aDate !== undefined && bDate !== undefined && aDate !== bDate) {
    return bDate - aDate;
  }

  if (a.entry.id < b.entry.id) return -1;
  if (a.entry.id > b.entry.id) return 1;
  return 0;
}

export async function getArticleRecords({
  filterDraft = import.meta.env.FILTER_DRAFT_ARTICLES === "true",
}: {
  filterDraft?: boolean;
} = {}): Promise<ArticleRecord[]> {
  const entries = await getCollection("articles", ({ data }) =>
    isArticleVisible(data.draft, filterDraft),
  );

  const records = await Promise.all(
    entries.map(async (entry) => ({
      entry,
      metadata: await getArticleMetadata(entry),
    })),
  );

  return records.sort(compareArticleRecords);
}
