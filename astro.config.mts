import { remarkReadingTime } from "#lib/remark-reading-time.js";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import type { AstroUserConfig } from "astro";
import { defineConfig } from "astro/config";

// https://docs.astro.build/ko/reference/configuration-reference/#이미지-옵션
const imageConfig: AstroUserConfig["image"] = {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "app.notion.com",
    },
  ],
};

// https://docs.astro.build/ko/guides/integrations-guide/sitemap/#구성
const sitemapConfig = sitemap({
  namespaces: {
    news: false,
    video: false,
  },
});

// https://docs.astro.build/ko/guides/markdown-content/#markdown-플러그인
const markdownConfig: AstroUserConfig["markdown"] = {
  processor: unified({
    remarkPlugins: [remarkReadingTime],
  }),
};

// https://docs.astro.build/ko/reference/configuration-reference/
export default defineConfig({
  output: "static",
  image: imageConfig,
  markdown: markdownConfig,
  experimental: { contentIntellisense: true, incrementalBuild: true },
  integrations: [sitemapConfig],
});
