import type { ArticleMetadata } from "./article-metadata";

import { withBasePath } from "../utils";

/** Shared configured public URL projection for article and derived preview routes. */
export function publicSiteUrl(path: string, site: string, base: string) {
  return new URL(withBasePath(path, base), site).href;
}

export function articleSocial(
  metadata: ArticleMetadata,
  site: string,
  base: string,
  docsRevision: string,
  previewHash?: string
) {
  if (!/^[a-f0-9]{40}$/.test(docsRevision))
    throw new Error("Missing pinned Docs revision");
  const url = publicSiteUrl(`/articles/${metadata.id}/`, site, base);
  const image = previewHash
    ? publicSiteUrl(`/social-previews/${previewHash}.png`, site, base)
    : undefined;
  const published = metadata.publishedAt?.toISOString();
  const modified = metadata.updatedAt?.toISOString();
  return {
    url,
    image,
    docsRevision,
    title: metadata.title,
    description: metadata.description,
    siteName: "ooMia",
    author: metadata.author.profileUrl,
    tags: metadata.tags,
    published,
    modified,
    jsonLd: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: metadata.title,
      description: metadata.description,
      url,
      mainEntityOfPage: url,
      author: {
        "@type": "Person",
        name: metadata.author.name,
        url: metadata.author.profileUrl,
      },
      ...(published ? { datePublished: published } : {}),
      ...(modified ? { dateModified: modified } : {}),
      ...(metadata.tags.length ? { keywords: metadata.tags.join(", ") } : {}),
    }).replace(/</g, "\\u003c"),
  };
}
