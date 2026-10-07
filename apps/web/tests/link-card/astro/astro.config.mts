import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { mdx } from "@workspace/md";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";

import { articleProcessors } from "../../../src/lib/content/article-processors";
import resolveFixtureCard from "../resolver";
const processors = articleProcessors(resolveFixtureCard);
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
