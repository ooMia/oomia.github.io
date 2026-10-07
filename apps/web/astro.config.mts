import type { AstroUserConfig } from "astro";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { mdx } from "@workspace/md";
import { defineConfig } from "astro/config";
import { mergeWith } from "es-toolkit";

import resolveLinkCardProps from "@/lib/content/link-card";
import { normalizeSiteUrl, normalizeBasePath } from "@/lib/utils";

import { articleProcessors } from "./src/lib/content/article-processors";
import { pinnedDocsRevision } from "./src/lib/content/docs-revision";

const site = normalizeSiteUrl(process.env["SITE_URL"] ?? process.env["SITE"]);
const base = normalizeBasePath(process.env["BASE_PATH"]);
const processors = articleProcessors(resolveLinkCardProps);

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
    processor: processors.markdown,
  },
  // https://docs.astro.build/ko/guides/integrations-guide/mdx
  integrations: [mdx({ processor: processors.mdx })],
};

// https://docs.astro.build/en/guides/integrations-guide/react/
const reactConfig: AstroUserConfig = {
  integrations: [react()],
};

const integrations = [sitemapConfig, markdownExConfig, reactConfig];

const vite: AstroUserConfig["vite"] = {
  plugins: [tailwindcss()],
  define: {
    "import.meta.env.DOCS_REVISION": JSON.stringify(pinnedDocsRevision()),
  },
};

// https://astro.build/config
export default defineConfig(
  integrations.reduce(
    (target, source) =>
      mergeWith(target, source, (o1, o2) =>
        Array.isArray(o1) && Array.isArray(o2) ? [...o1, ...o2] : undefined
      ),
    // https://docs.astro.build/ko/reference/configuration-reference/
    {
      site,
      base,
      output: "static",
      vite,
      prefetch: {
        prefetchAll: true,
        defaultStrategy: "hover",
      },
      experimental: {
        contentIntellisense: true,
        incrementalBuild: true,
        clientPrerender: true,
      },
    }
  )
);
