import type { Nodes, Root, RootContent } from "mdast";

import { definitions } from "mdast-util-definitions";

import {
  normalizeExternalLinkCandidate,
  standaloneLinkContent,
  type ExternalLinkCandidate,
} from "./normalize";

export type ExternalLinkTarget = (
  candidate: ExternalLinkCandidate
) => RootContent | undefined;

/** Public remark adapter; normalization/policy are independent of Site presentation. */
export default function externalLink(target: ExternalLinkTarget) {
  return () => (root: Root) => {
    const resolveDefinition = definitions(root);
    function walk(parent: Nodes) {
      if (!("children" in parent)) return;
      parent.children.forEach((block, index) => {
        const node = standaloneLinkContent(block, parent);
        const candidate =
          node && normalizeExternalLinkCandidate(node, resolveDefinition);
        const replacement = candidate && target(candidate);
        if (replacement) parent.children[index] = replacement;
        else if (["blockquote", "list", "listItem"].includes(block.type))
          walk(block);
      });
    }
    walk(root);
  };
}
