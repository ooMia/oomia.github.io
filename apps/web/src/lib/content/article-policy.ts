import type { ArticleMetadata } from "./article-metadata";

export interface ArticleOrderKey {
  readonly id: string;
  readonly publishedAt?: Date;
}

export function isArticleVisible(
  draft: boolean | undefined,
  filterDraft: boolean,
) {
  return !filterDraft || draft !== true;
}

export function compareArticleOrder(a: ArticleOrderKey, b: ArticleOrderKey) {
  const aDate = a.publishedAt?.getTime();
  const bDate = b.publishedAt?.getTime();

  if (aDate !== undefined && bDate === undefined) return -1;
  if (aDate === undefined && bDate !== undefined) return 1;

  if (aDate !== undefined && bDate !== undefined && aDate !== bDate) {
    return bDate - aDate;
  }

  return a.id.localeCompare(b.id);
}

export function compareArticleMetadata(
  a: ArticleMetadata,
  b: ArticleMetadata,
) {
  return compareArticleOrder(a, b);
}
