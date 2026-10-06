import { externalLink } from "@workspace/md";

import type { LinkCardResolver } from "./link-card";

export function linkCardBinding(resolve: LinkCardResolver) {
  return externalLink(({ href, attributes }) =>
    resolve(href)
      ? {
          type: "mdxJsxFlowElement",
          name: "LinkCard",
          attributes: [
            { type: "mdxJsxAttribute", name: "href", value: href },
            ...attributes,
          ],
          children: [],
        }
      : undefined
  );
}
