import type { HastContent, HastNode } from "satteri";

import type { HastPluginEntry } from "../../types";

/** Site supplies a target or declines it; no producer schema or presentation here. */
export type StandaloneLinkTarget = (
  href: string,
  anchor: Readonly<Extract<HastNode, { type: "element" }>>
) => HastContent | undefined;

function isExternalHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function linkCard(
  target: StandaloneLinkTarget
): HastPluginEntry {
  return {
    name: "standalone-external-link",
    element: {
      filter: ["a"],
      visit(node, ctx) {
        const parent = ctx.parent(node);
        const href = node.properties.href;
        if (
          typeof href !== "string" ||
          !isExternalHttpUrl(href) ||
          parent?.type !== "element" ||
          parent.tagName !== "p" ||
          parent.children.length !== 1
        )
          return;
        const replacement = target(href, node);
        if (replacement) ctx.replaceNode(node, replacement);
      },
    },
  };
}
