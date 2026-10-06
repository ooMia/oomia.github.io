import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { mdx } from "@workspace/md";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";

import { articleProcessors } from "../../../src/lib/content/article-processors";
import { createLinkCardResolver } from "../../../src/lib/content/link-card";
import records from "../manifest.json";
const processors = articleProcessors(createLinkCardResolver(records));
export default defineConfig({
  output: "static",
  markdown: { processor: processors.markdown },
  integrations: [mdx({ processor: processors.mdx }), react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("../../../src", import.meta.url)) },
    },
  },
});
