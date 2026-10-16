import type { APIRoute } from "astro";

import rss from "@astrojs/rss";

import { publicSiteUrl } from "@/lib/content/article-social";
import { getArticleRecords } from "@/lib/content/articles";
import { localizedArticleUrl } from "@/lib/presentation/locale";

export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL;
  const url = (path: string) => publicSiteUrl(path, site!.href, base);
  const articles = await getArticleRecords();
  return rss({
    title: "ooMia — 개발 기록과 실험",
    description: "ooMia의 소프트웨어 개발 기록과 작은 실험.",
    site: url("/"),
    customData: "<language>ko-KR</language>",
    items: articles.map(({ metadata }) => ({
      title: metadata.title,
      description: metadata.description,
      link: url(localizedArticleUrl(metadata.id, "ko")),
      ...(metadata.publishedAt ? { pubDate: metadata.publishedAt } : {}),
      categories: [...metadata.tags],
    })),
  });
};
