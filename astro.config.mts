import { defineConfig } from "astro/config";
import type { AstroUserConfig } from "astro";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import readingTime from "#plugins/mdast/reading-time";
import mdx from "@astrojs/mdx";
import { mergeWith } from "es-toolkit";

// https://docs.astro.build/ko/guides/integrations-guide/sitemap/#구성
const sitemapConfig: AstroUserConfig = {
  integrations: [
    sitemap({
      namespaces: {
        news: false,
        video: false,
      },
    }),
  ],
};

const markdownExConfig: AstroUserConfig = {
  // https://docs.astro.build/ko/guides/markdown-content/#markdown-플러그인
  markdown: {
    processor: satteri({ mdastPlugins: [readingTime] }),
  },
  // https://docs.astro.build/ko/guides/integrations-guide/mdx
  integrations: [mdx()],
};

const integrations = [sitemapConfig, markdownExConfig];

// https://docs.astro.build/ko/reference/configuration-reference/#이미지-옵션
const imageConfig: AstroUserConfig["image"] = {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "app.notion.com",
    },
  ],
};

export default defineConfig(
  integrations.reduce(
    (target, source) =>
      mergeWith(target, source, (target, source) =>
        Array.isArray(target) && Array.isArray(source) ? [...target, ...source] : undefined,
      ),
    // https://docs.astro.build/ko/reference/configuration-reference/
    {
      output: "static",
      image: imageConfig,
      prefetch: {
        prefetchAll: true,
        defaultStrategy: "viewport",
      },
      experimental: { contentIntellisense: true, incrementalBuild: true, clientPrerender: true },
    },
  ),
);
