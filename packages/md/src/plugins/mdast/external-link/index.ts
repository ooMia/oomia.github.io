import type { MdastNode } from "satteri";

import {
  collectDefinitions,
  normalizeExternalLinkCandidate,
  standaloneLinkContent,
  type ExternalLinkCandidate,
} from "./normalize";

export type ExternalLinkTarget = (
  candidate: ExternalLinkCandidate
) => MdastNode | undefined;

/** Public remark adapter; normalization/policy are independent of Site presentation. */
export default function externalLink(target: ExternalLinkTarget) {
  return () => (root: MdastNode) => {
    const definitions = collectDefinitions(root);
    function walk(parent: MdastNode) {
      if (!("children" in parent)) return;
      const children = parent.children as MdastNode[];
      children.forEach((block, index) => {
        const eligibleBlock =
          block.type === "paragraph" ||
          (block.type === "mdxJsxFlowElement" &&
            ["root", "blockquote", "listItem"].includes(parent.type));
        const node = eligibleBlock && standaloneLinkContent(block);
        const candidate =
          node && normalizeExternalLinkCandidate(node, definitions);
        const replacement = candidate && target(candidate);
        if (replacement) children[index] = replacement;
        else walk(block);
      });
    }
    walk(root);
  };
}
