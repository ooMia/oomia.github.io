import type { APIRoute } from "astro";

import { publicSiteUrl } from "@/lib/content/article-social";

const getRobotsTxt = (sitemapURL: string) => `\
User-agent: *
Allow: /

Sitemap: ${sitemapURL}
`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = publicSiteUrl(
    "/sitemap-index.xml",
    site!.href,
    import.meta.env.BASE_URL
  );
  return new Response(getRobotsTxt(sitemapURL), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
