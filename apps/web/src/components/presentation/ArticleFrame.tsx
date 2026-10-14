import type { TOCItemType } from "fumadocs-core/toc";

import { AnchorProvider } from "fumadocs-core/toc";
import { DocsBody } from "fumadocs-ui/layouts/docs/page";
import { useRef } from "react";

import type { ArticleAuthor } from "@/lib/content/article-metadata";
import type { ArticleVisualModel } from "@/lib/presentation/articles";

import type { SiteFrameProps } from "./SiteFrame";

import { ArticleTags } from "./ArticleTags";
import { ArticleTOC } from "./ArticleTOC";
import { ArticleVisual } from "./ArticleVisual";
import { Icon } from "./Icon";
import { NativeArticleEnhancements } from "./NativeArticleEnhancements";
import { ReadingProgress } from "./ReadingProgress";
import { SiteFooter, SiteFrame } from "./SiteFrame";
import "./article.css";

interface ArticleFrameProps extends SiteFrameProps {
  articleId?: string;
  visual?: ArticleVisualModel;
  title: string;
  description: string;
  author: ArticleAuthor;
  publishedAt?: string | undefined;
  updatedAt?: string | undefined;
  tags: string[];
  readingMinutes: number;
  toc: TOCItemType[];
  originalUrl?: string;
  translated?: boolean;
  fallback?: boolean;
}

function formatDate(value: string, locale: "ko" | "en") {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

// Frontmatter backticks use the same visible inline-code convention as Home.
function metadataText(text: string) {
  return text
    .split(/(`[^`]+`)/g)
    .map((part, index) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <code key={index}>{part.slice(1, -1)}</code>
      ) : (
        part
      )
    );
}

export function ArticleFrame({
  articleId,
  visual,
  title,
  description,
  author,
  publishedAt,
  updatedAt,
  tags,
  readingMinutes,
  toc,
  originalUrl,
  translated = false,
  fallback = false,
  locale = "ko",
  children,
  ...site
}: ArticleFrameProps) {
  const body = useRef<HTMLDivElement>(null);
  const contentLanguage = fallback ? "ko" : locale;
  return (
    <SiteFrame {...site} locale={locale}>
      <article
        id="main"
        tabIndex={-1}
        className="article-shell"
        data-article-id={articleId}
      >
        <a className="article-back-link" href={site.homeUrl}>
          <Icon name="arrow-left" />
          {locale === "en" ? "Notes and experiments" : "개발 기록과 실험"}
        </a>
        <header className="article-header">
          {visual ? (
            <div className="article-hero-clip" aria-hidden="true">
              <div className="article-hero-art">
                <ArticleVisual visual={visual} />
              </div>
            </div>
          ) : null}
          <div className="article-heading-content" lang={contentLanguage}>
            <p className="article-eyebrow" lang="en">
              FIELD NOTES
            </p>
            <h1>{metadataText(title)}</h1>
            <p className="article-description">{metadataText(description)}</p>
            <div className="article-metadata" lang={locale}>
              <a href={author.profileUrl} rel="author">
                {author.handle}
              </a>
              {publishedAt ? (
                <time dateTime={publishedAt}>
                  {formatDate(publishedAt, locale)}
                </time>
              ) : null}
              {updatedAt && updatedAt !== publishedAt ? (
                <span className="article-updated">
                  {locale === "en" ? "Updated " : "수정 "}
                  <time dateTime={updatedAt}>
                    {formatDate(updatedAt, locale)}
                  </time>
                </span>
              ) : null}
              <span>
                {readingMinutes}
                {locale === "en" ? " min read" : "분 읽기"}
              </span>
            </div>
            <ArticleTags tags={tags} homeUrl={site.homeUrl} locale={locale} />
          </div>
        </header>
        {fallback || translated ? (
          <div className="article-translation-notice" role="note" lang={locale}>
            <Icon name="languages" />
            <p>
              {fallback
                ? locale === "en"
                  ? "English translation is not available yet. Reading the original Korean article."
                  : "번역본이 아직 없습니다. 한국어 원문을 표시합니다."
                : locale === "en"
                  ? "AI-translated from Korean."
                  : "AI 번역본입니다."}
            </p>
            {originalUrl ? (
              <a href={originalUrl} hrefLang="ko">
                {locale === "en" ? "View original" : "원문 보기"}
                <Icon name="arrow-right" />
              </a>
            ) : null}
          </div>
        ) : null}
        <AnchorProvider toc={toc} single>
          <ReadingProgress bodyRef={body} items={toc} locale={locale} />
          <div className="article-grid">
            <div className="article-content">
              <ArticleTOC
                items={toc}
                variant="compact"
                locale={locale}
                contentLanguage={contentLanguage}
              />
              <DocsBody
                ref={body}
                className="article-body"
                lang={contentLanguage}
                data-reading-body
              >
                {children}
              </DocsBody>
              <NativeArticleEnhancements bodyRef={body} locale={locale} />
            </div>
            <ArticleTOC
              items={toc}
              variant="rail"
              locale={locale}
              contentLanguage={contentLanguage}
            />
          </div>
        </AnchorProvider>
        <SiteFooter locale={locale} />
      </article>
    </SiteFrame>
  );
}
