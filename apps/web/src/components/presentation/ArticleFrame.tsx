import { DocsBody } from "fumadocs-ui/layouts/docs/page";

import type { SiteFrameProps } from "./SiteFrame";

import { SiteFrame } from "./SiteFrame";

interface ArticleFrameProps extends SiteFrameProps {
  title: string;
  description: string;
  readingMinutes: number;
}

export function ArticleFrame({
  title,
  description,
  readingMinutes,
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
        <DocsBody>{children}</DocsBody>
      </article>
    </SiteFrame>
  );
}
