import {
  readingTime,
  remarkReadingTime,
  satteri,
  unified,
} from "@workspace/md";

import type { LinkCardResolver } from "./link-card";

import { linkCardBinding } from "./link-card-binding";

const features = {
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

/** Public Astro integration: native Markdown stays separate from MDX enhancement. */
export function articleProcessors(resolve: LinkCardResolver) {
  return {
    markdown: satteri({ features, mdastPlugins: [readingTime] }),
    mdx: unified({
      gfm: true,
      smartypants: false,
      remarkPlugins: [remarkReadingTime, linkCardBinding(resolve)],
    }),
  };
}
