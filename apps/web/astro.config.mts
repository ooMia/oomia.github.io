import type { AstroUserConfig } from "astro";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { mdx } from "@workspace/md";
import { defineConfig, envField } from "astro/config";
import { mergeWith } from "es-toolkit";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadEnv } from "vite-plus";

import resolveLinkCardProps from "@/lib/content/link-card";

import { parseSiteEnvironment } from "./src/config/environment";
import { articleProcessors } from "./src/lib/content/article-processors";
import { verifyDocsConsumption } from "./src/lib/content/docs-consumption";
import { resolvedDocsRevision } from "./src/lib/content/docs-revision";

const processors = articleProcessors(resolveLinkCardProps);

const environmentConfig: AstroUserConfig = {
  env: {
    schema: {
      FILTER_DRAFT_ARTICLES: envField.string({
        context: "server",
        access: "public",
        default: "false",
      }),
    },
  },
  integrations: [
    {
      name: "site-environment",
      hooks: {
        "astro:config:setup": ({ config, command, updateConfig }) => {
          const { values } = parseArgs({
            strict: false,
            allowPositionals: true,
            options: { mode: { type: "string" } },
          });
          const mode =
            typeof values.mode === "string"
              ? values.mode
              : (config.vite.mode ??
                (command === "build" || command === "preview"
                  ? "production"
                  : "development"));
          const webRoot = fileURLToPath(config.root);
          const environment = parseSiteEnvironment({
            ...loadEnv(mode, webRoot, ""),
            ...process.env,
          });
          const docsRevision = resolvedDocsRevision(
            webRoot,
            environment.docsCheckoutMode,
            environment.docsCheckoutRevision
          );
          if (environment.docsCheckoutMode === "resolved")
            console.log(
              "Prepared Docs snapshot:",
              verifyDocsConsumption(resolve(webRoot, "data/articles"))
            );
          updateConfig({
            site: environment.siteUrl,
            base: environment.basePath,
            vite: {
              define: {
                "import.meta.env.DOCS_REVISION": JSON.stringify(docsRevision),
              },
            },
          });
        },
      },
    },
  ],
};

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
  environmentConfig,
  sitemapConfig,
  markdownExConfig,
  reactConfig,
];

const vite: AstroUserConfig["vite"] = {
  plugins: [tailwindcss()],
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
