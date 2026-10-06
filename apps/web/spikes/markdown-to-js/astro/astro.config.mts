import react from "@astrojs/react";
import { mdx } from "@workspace/md";
import { defineConfig } from "astro/config";

import { createLinkCardResolver } from "../../../src/lib/content/link-card";
import records from "../fixtures/manifest.json";
import { componentMarkdownProcessor } from "../processor";

export default defineConfig({
  output: "static",
  markdown: {
    processor: componentMarkdownProcessor(createLinkCardResolver(records)),
  },
  integrations: [mdx({ optimize: false }), react()],
});
