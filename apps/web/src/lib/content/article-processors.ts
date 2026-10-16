import {
  readingTime,
  remarkReadingTime,
  satteri,
  unified,
} from "@workspace/md";

import type { LinkCardResolver } from "./link-card";

import {
  nativeArticlePresentation,
  nativeCodeSources,
  rehypeArticlePresentation,
} from "./article-native";
import { linkCardBinding } from "./link-card-binding";

export const markdownFeatures = {
  gfm: true,
  frontmatter: true,
  math: true,
  headingAttributes: true,
  directive: true,
  superscript: true,
  subscript: true,
  wikilinks: true,
  smartPunctuation: false,
};

/** Shared native Shiki configuration for Markdown, MDX and contract fixtures. */
export const articleShikiConfig = {
  themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
  defaultColor: "light",
  wrap: false,
} as const;

/** Public Astro integration: native Markdown stays separate from MDX enhancement. */
export function articleProcessors(resolve: LinkCardResolver) {
  return {
    markdown: satteri({
      features: markdownFeatures,
      mdastPlugins: [readingTime, nativeCodeSources],
      hastPlugins: [nativeArticlePresentation],
    }),
    mdx: unified({
      gfm: true,
      smartypants: false,
      remarkPlugins: [remarkReadingTime, linkCardBinding(resolve)],
      rehypePlugins: [rehypeArticlePresentation],
    }),
  };
}
