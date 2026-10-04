import type { CollectionEntry } from "astro:content";

import { getEntry } from "astro:content";

import {
  type ArticleGitHistory,
  readArticleGitHistory,
} from "./article-history";

export interface ArticleAuthor {
  readonly id: string;
  readonly handle: string;
  readonly name: string;
  readonly profileUrl: string;
  readonly email: string;
}

export interface ArticleMetadata {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly author: ArticleAuthor;
  readonly tags: readonly string[];
  readonly publishedAt?: Date;
  readonly updatedAt?: Date;
  readonly draft: boolean;
  readonly aliases: readonly string[];
}

interface SourceArticleMetadata {
  readonly title: string;
  readonly description: string;
  readonly tags?: readonly string[] | null;
  readonly date?: Date;
  readonly updatedDate?: Date;
  readonly draft?: boolean;
  readonly aliases?: readonly string[] | null;
}

interface SourceAuthorMetadata {
  readonly handle: string;
  readonly name: string;
  readonly profileUrl: string;
  readonly email: string;
}

export function resolveArticleDates(
  source: Pick<SourceArticleMetadata, "date" | "updatedDate">,
  history?: ArticleGitHistory,
) {
  return {
    publishedAt: source.date ?? history?.firstAuthorDate,
    updatedAt: source.updatedDate ?? history?.lastAuthorDate,
  };
}

export function mapArticleMetadata(
  id: string,
  source: SourceArticleMetadata,
  authorId: string,
  author: SourceAuthorMetadata,
  history?: ArticleGitHistory,
): ArticleMetadata {
  const dates = resolveArticleDates(source, history);

  return {
    id,
    title: source.title,
    description: source.description,
    author: {
      id: authorId,
      handle: author.handle,
      name: author.name,
      profileUrl: author.profileUrl,
      email: author.email,
    },
    tags: source.tags ?? [],
    publishedAt: dates.publishedAt,
    updatedAt: dates.updatedAt,
    draft: source.draft === true,
    aliases: source.aliases ?? [],
  };
}

export async function getArticleMetadata(
  entry: CollectionEntry<"articles">,
): Promise<ArticleMetadata> {
  const author = await getEntry(entry.data.author);
  if (!author) {
    throw new Error(
      `Article "${entry.id}" references missing author "${entry.data.author.id}".`,
    );
  }

  return mapArticleMetadata(
    entry.id,
    entry.data,
    author.id,
    author.data,
    readArticleGitHistory(entry.filePath),
  );
}

export function formatArticleDate(date: Date | undefined) {
  if (!date) return undefined;

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(date);
}
