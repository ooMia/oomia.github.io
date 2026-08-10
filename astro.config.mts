import { defineConfig } from "astro/config";

export default defineConfig({
  experimental: { contentIntellisense: true, incrementalBuild: true },
  integrations: [],
});
