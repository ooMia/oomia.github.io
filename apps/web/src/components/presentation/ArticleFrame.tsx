import type { TOCItemType } from "fumadocs-core/toc";

import { AnchorProvider } from "fumadocs-core/toc";
import { DocsBody } from "fumadocs-ui/layouts/docs/page";

import type { SiteFrameProps } from "./SiteFrame";

import { ArticleTOC } from "./ArticleTOC";
import { SiteFrame } from "./SiteFrame";
import "./article.css";

interface ArticleFrameProps extends SiteFrameProps {
  title: string;
  description: string;
  readingMinutes: number;
  toc: TOCItemType[];
}

export function ArticleFrame({
  title,
  description,
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
          <p className="text-sm text-fd-muted-foreground">
            {readingMinutes} min read
          </p>
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
