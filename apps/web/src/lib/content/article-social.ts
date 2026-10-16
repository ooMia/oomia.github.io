import type { ArticleMetadata } from "./article-metadata";

import { localizedArticleUrl } from "../presentation/locale";
import { withBasePath } from "../utils";

export interface ArticleSocialImage {
  path: string;
  width: number;
  height: number;
  mediaType: "image/png" | "image/jpeg";
}

/** Shared configured public URL projection for article and derived preview routes. */
export function publicSiteUrl(path: string, site: string, base: string) {
  return new URL(withBasePath(path, base), site).href;
}

export function articleSocial(
  metadata: ArticleMetadata,
  site: string,
  base: string,
  docsRevision: string,
  socialImage?: ArticleSocialImage
) {
  if (!/^[a-f0-9]{40}$/.test(docsRevision))
    throw new Error("Missing Docs checkout revision");
  const url = new URL(localizedArticleUrl(metadata.id, "ko", base), site).href;
  const image = socialImage
    ? { ...socialImage, url: publicSiteUrl(socialImage.path, site, base) }
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
