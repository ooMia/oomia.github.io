import type { AstroUserConfig } from "astro";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import readingTime from "#plugins/mdast/reading-time";
import mdx from "@astrojs/mdx";
import { mergeWith } from "es-toolkit";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import { normalizeBasePath, normalizeSiteUrl } from "./lib/utils";

const site = normalizeSiteUrl(process.env["SITE_URL"] ?? process.env["SITE"]);
const base = normalizeBasePath(process.env["BASE_PATH"]);

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
    processor: satteri({
      features: {
        gfm: true,
        frontmatter: true,
        math: true,
        headingAttributes: true,
        directive: true,
        superscript: true,
        subscript: true,
        wikilinks: true,
        smartPunctuation: false,
      },
      mdastPlugins: [readingTime],
    }),
  },
  // https://docs.astro.build/ko/guides/integrations-guide/mdx
  integrations: [mdx()],
};

// https://docs.astro.build/en/guides/integrations-guide/react/
const reactConfig: AstroUserConfig = {
  integrations: [react()],
};

const integrations = [sitemapConfig, markdownExConfig, reactConfig];

// https://docs.astro.build/ko/reference/configuration-reference/#이미지-옵션
const image: AstroUserConfig["image"] = {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "app.notion.com",
    },
  ],
};

const vite: AstroUserConfig["vite"] = {
  plugins: [tailwindcss()],
};

export default defineConfig(
  integrations.reduce(
    (target, source) =>
      mergeWith(target, source, (target, source) =>
        Array.isArray(target) && Array.isArray(source) ? [...target, ...source] : undefined,
      ),
    // https://docs.astro.build/ko/reference/configuration-reference/
    {
      site,
      ...(base ? { base } : {}),
      output: "static",
      image,
      vite,
      prefetch: {
        prefetchAll: true,
        defaultStrategy: "hover",
      },
      experimental: { contentIntellisense: true, incrementalBuild: true, clientPrerender: true },
    },
  ),
);
