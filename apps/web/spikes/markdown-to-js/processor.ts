import type { MarkdownProcessor } from "astro/markdown";

import { satteri } from "@workspace/md";

import type { LinkCardResolver } from "../../src/lib/content/link-card";

import { componentBinding } from "./binding";
import { compileAndRender } from "./compile";

/** Deliberately opt-in proof; metadata delegate costs a second Markdown compile. */
export function componentMarkdownProcessor(
  resolve: LinkCardResolver
): MarkdownProcessor {
  const binding = componentBinding(resolve);
  const metadataProcessor = satteri({ features: { smartPunctuation: false } });
  const mdxProcessor = satteri({
    features: { smartPunctuation: false },
    hastPlugins: [binding.plugin],
  });
  return {
    name: "site-markdown-component-spike",
    options: {},
    async createRenderer(shared) {
      const delegate = await metadataProcessor.createRenderer(shared);
      return {
        async render(source, opts) {
          const metadata = await delegate.render(source, opts);
          const output = await compileAndRender(
            source,
            "markdown",
            {
              features: { rawHtml: true, smartPunctuation: false },
              hastPlugins: [binding.plugin],
              ...(opts?.fileURL ? { fileURL: opts.fileURL } : {}),
            },
            binding.components
          );
          return { code: output.html, metadata: metadata.metadata };
        },
      };
    },
    createMdxRenderer(shared, options) {
      // Public delegation preserves Astro's MDX compilation/assets/component handling.
      return mdxProcessor.createMdxRenderer!(shared, options);
    },
  };
}
