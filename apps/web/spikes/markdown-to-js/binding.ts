import { linkCard } from "@workspace/md";
import { createElement } from "react";

import type { LinkCardResolver } from "../../src/lib/content/link-card";

import LinkCard from "./LinkCard";

export function componentBinding(resolve: LinkCardResolver) {
  return {
    plugin: linkCard((href) =>
      resolve(href)
        ? {
            type: "mdxJsxTextElement",
            name: "LinkCard",
            attributes: [
              { type: "mdxJsxAttribute", name: "href", value: href },
            ],
            children: [],
          }
        : undefined
    ),
    components: {
      LinkCard({ href }: { href: string }) {
        const props = resolve(href);
        if (!props)
          throw new Error("Projection changed between compile and render");
        return createElement(LinkCard, props);
      },
    },
  };
}
