import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

const sitemapConfig = sitemap({
  namespaces: {
    news: false,
    video: false,
  },
});

// https://docs.astro.build/ko/reference/configuration-reference/
export default defineConfig({
  output: "static",
  experimental: { contentIntellisense: true, incrementalBuild: true },
  integrations: [sitemapConfig],
});
