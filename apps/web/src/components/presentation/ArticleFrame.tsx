import type { TOCItemType } from "fumadocs-core/toc";

import { AnchorProvider } from "fumadocs-core/toc";
import { DocsBody } from "fumadocs-ui/layouts/docs/page";

import type { ArticleAuthor } from "@/lib/content/article-metadata";

import type { SiteFrameProps } from "./SiteFrame";

import { ArticleTOC } from "./ArticleTOC";
import { SiteFrame } from "./SiteFrame";
import "./article.css";

interface ArticleFrameProps extends SiteFrameProps {
  title: string;
  description: string;
  author: ArticleAuthor;
  publishedAt?: string;
  updatedAt?: string;
  tags: string[];
  readingMinutes: number;
  toc: TOCItemType[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function ArticleFrame({
  title,
  description,
  author,
  publishedAt,
  updatedAt,
  tags,
  readingMinutes,
  toc,
  children,
  ...site
}: ArticleFrameProps) {
  return (
    <SiteFrame {...site}>
      <article className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-16">
        <header className="mb-10 space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="text-lg text-fd-muted-foreground">{description}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-fd-muted-foreground">
            <a
              className="font-medium text-fd-foreground underline-offset-4 hover:underline"
              href={author.profileUrl}
              rel="author"
            >
              {author.handle}
            </a>
            {publishedAt ? (
              <span>
                Published{" "}
                <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
              </span>
            ) : null}
            {updatedAt ? (
              <span>
                Updated{" "}\n                <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
              </span>
            ) : null}
            <span>{readingMinutes} min read</span>
          </div>
          {tags.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-fd-border px-2.5 py-1 text-xs text-fd-muted-foreground"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          ) : null}
        </header>
        <AnchorProvider toc={toc} single>
          <ArticleTOC items={toc} />
          <DocsBody className="article-body [&_h1]:scroll-mt-32 [&_h2]:scroll-mt-32 [&_h3]:scroll-mt-32 [&_h4]:scroll-mt-32 [&_h5]:scroll-mt-32 [&_h6]:scroll-mt-32">
            {children}
          </DocsBody>
        </AnchorProvider>
      </article>
    </SiteFrame>
  );
}
