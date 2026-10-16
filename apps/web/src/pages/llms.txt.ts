import type { APIRoute } from "astro";

import { publicSiteUrl } from "@/lib/content/article-social";
import { getArticleRecords } from "@/lib/content/articles";
import { localizedArticleUrl } from "@/lib/presentation/locale";

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();
const linkLabel = (value: string) => oneLine(value).replace(/[\\[\]]/g, "\\$&");

export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL;
  const url = (path: string) => publicSiteUrl(path, site!.href, base);
  const articles = await getArticleRecords();
  const body = [
    "# ooMia",
    "",
    "> Software development notes and experiments by ooMia, published in Korean.",
    "",
    "Article links below point to the canonical originals. Each summary comes from the Article's description.",
    "",
    "## Site",
    "",
    `- [Home](${url("/")}): About ooMia and recent writing.`,
    `- [Sitemap](${url("/sitemap-index.xml")}): Published Site URLs.`,
    `- [RSS feed](${url("/rss.xml")}): Canonical Article titles, summaries and publication dates.`,
    "",
    "## Articles",
    "",
    ...articles.map(
      ({ metadata }) =>
        `- [${linkLabel(metadata.title)}](${url(localizedArticleUrl(metadata.id, "ko"))}): ${oneLine(metadata.description)}`
    ),
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
