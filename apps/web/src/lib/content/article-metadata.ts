import type { ArticleGitHistory } from "./article-history";

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

export interface SourceArticleMetadata {
  readonly title: string;
  readonly description: string;
  readonly author: string;
  readonly tags?: readonly string[] | null;
  readonly date?: Date;
  readonly updatedDate?: Date;
  readonly draft?: boolean;
  readonly aliases?: readonly string[] | null;
}

export const SITE_AUTHOR: ArticleAuthor = {
  id: "oomia",
  handle: "ooMia",
  name: "Hyeon-hak Kim",
  profileUrl: "https://github.com/ooMia",
  email: "dev@oomia.click",
};

export function resolveArticleDates(
  source: Pick<SourceArticleMetadata, "date" | "updatedDate">,
  history?: ArticleGitHistory,
) {
  return {
    publishedAt: source.date ?? history?.firstAuthorDate,
    updatedAt: source.updatedDate ?? history?.lastAuthorDate,
  };
}

export function resolveArticleAuthor(author: string): ArticleAuthor {
  if (author.trim().toLowerCase() !== SITE_AUTHOR.id) {
    throw new Error(`Unsupported article author: ${author}`);
  }

  return SITE_AUTHOR;
}

export function mapArticleMetadata(
  id: string,
  source: SourceArticleMetadata,
  history?: ArticleGitHistory,
): ArticleMetadata {
  const dates = resolveArticleDates(source, history);

  return {
    id,
    title: source.title,
    description: source.description,
    author: resolveArticleAuthor(source.author),
    tags: source.tags ?? [],
    publishedAt: dates.publishedAt,
    updatedAt: dates.updatedAt,
    draft: source.draft === true,
    aliases: source.aliases ?? [],
  };
}

export function formatArticleDate(date: Date | undefined) {
  if (!date) return undefined;

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(date);
}
