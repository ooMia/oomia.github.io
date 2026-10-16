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
import { fonts } from "./src/config/fonts";
import { verifyDocsConsumption } from "./src/lib/content/docs-consumption";
import { resolvedDocsRevision } from "./src/lib/content/docs-revision";
import { themeCsp } from "./src/lib/security/theme-csp";

const site = normalizeSiteUrl(process.env["SITE_URL"] ?? process.env["SITE"]);
const base = normalizeBasePath(process.env["BASE_PATH"]);
const processors = articleProcessors(resolveLinkCardProps);
if (process.env["DOCS_CHECKOUT_MODE"] === "resolved") {
  console.log("Prepared Docs snapshot:", verifyDocsConsumption());
}

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

const integrations = [
  sitemapConfig,
  markdownExConfig,
  reactConfig,
  { integrations: [themeCsp()] },
];

const vite: AstroUserConfig["vite"] = {
  plugins: [tailwindcss()],
  build: {
    assetsInlineLimit: (path, content) => {
      // Small Unicode shards must remain same-origin font files. Vite's data:
      // inlining would be blocked by the generated font-src 'self' policy.
      if (/\.(woff2?|ttf|otf)$/i.test(path)) return false;
      return path.endsWith(".css")
        ? content.byteLength <= 16 * 1024
        : undefined;
    },
  },
  define: {
    "import.meta.env.DOCS_REVISION": JSON.stringify(resolvedDocsRevision()),
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
      fonts,
      security: {
        csp: {
          algorithm: "SHA-256",
          directives: ["object-src 'none'", "base-uri 'self'"],
          scriptDirective: {
            resources: [{ resource: "'none'", kind: "attribute" }],
          },
          // Shiki and React use style attributes; stylesheets retain hashes.
          styleDirective: {
            // next-themes' transient transition-suppression stylesheet.
            // Browser regression checks this when toggling and restoring themes.
            hashes: ["sha256-skqujXORqzxt1aE0NNXxujEanPTX6raoqSscTV/Ww/Y="],
            resources: [{ resource: "'unsafe-inline'", kind: "attribute" }],
          },
        },
      },
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
