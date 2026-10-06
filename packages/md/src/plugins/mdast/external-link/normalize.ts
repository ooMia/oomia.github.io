import type { Nodes } from "mdast";
import type { definitions } from "mdast-util-definitions";
import type {
  MdxJsxAttribute,
  MdxJsxExpressionAttribute,
} from "mdast-util-mdx-jsx";

export interface ExternalLinkCandidate {
  readonly href: string;
  readonly attributes: readonly (MdxJsxAttribute | MdxJsxExpressionAttribute)[];
}

export function externalHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

/** Parse literal JSX values only. Never evaluate authored expressions or spreads. */
function literalString(value: MdxJsxAttribute["value"]): string | undefined {
  if (typeof value === "string") return value;
  const program = value?.data?.estree;
  const statement = program?.body[0];
  if (program?.body.length !== 1 || statement?.type !== "ExpressionStatement")
    return;
  const expression = statement.expression;
  if (expression.type === "Literal" && typeof expression.value === "string")
    return expression.value;
  if (
    expression.type === "TemplateLiteral" &&
    expression.expressions.length === 0
  )
    return expression.quasis[0]?.value.cooked ?? undefined;
  return undefined;
}

/** Parser-specific provenance stays here; core policy never inspects source spelling. */
export function normalizeExternalLinkCandidate(
  node: Readonly<Nodes>,
  resolveDefinition: ReturnType<typeof definitions>
): ExternalLinkCandidate | undefined {
  let href: string | undefined;
  let attributes: readonly (MdxJsxAttribute | MdxJsxExpressionAttribute)[] = [];
  if (node.type === "link") {
    // Explicit CommonMark labels start one position after their link. GFM literals
    // start at the same position; vendor wikilinks start two positions later. Fail closed
    // when the parser does not retain this provenance rather than trusting HAST a.
    const start = node.position?.start.offset;
    const labelStart = node.children[0]?.position?.start.offset;
    if (
      start === undefined ||
      (node.children.length > 0 && labelStart !== start + 1)
    )
      return;
    href = node.url;
    if (node.title)
      attributes = [
        { type: "mdxJsxAttribute", name: "title", value: node.title },
      ];
  } else if (node.type === "linkReference") {
    const definition = resolveDefinition(node.identifier);
    href = definition?.url;
    if (definition?.title)
      attributes = [
        { type: "mdxJsxAttribute", name: "title", value: definition.title },
      ];
  } else if (
    node.type === "mdxJsxFlowElement" ||
    node.type === "mdxJsxTextElement"
  ) {
    if (
      node.name !== "a" ||
      node.attributes.some((attr) => attr.type === "mdxJsxExpressionAttribute")
    )
      return;
    const hrefs = node.attributes.filter(
      (attr) => attr.type === "mdxJsxAttribute" && attr.name === "href"
    );
    if (hrefs.length !== 1) return;
    const attribute = hrefs[0];
    if (attribute?.type !== "mdxJsxAttribute") return;
    href = literalString(attribute.value);
    attributes = node.attributes.filter(
      (attr) => attr.type !== "mdxJsxAttribute" || attr.name !== "href"
    );
  }
  const normalized = href && externalHttpUrl(href);
  return normalized ? { href: normalized, attributes } : undefined;
}

/** Changing the standalone policy does not require changing parsing or presentation. */
export function standaloneLinkContent(
  block: Readonly<Nodes>,
  parent: Readonly<Nodes>
): Readonly<Nodes> | undefined {
  if (!["root", "blockquote", "listItem"].includes(parent.type)) return;
  if (block.type === "mdxJsxFlowElement") return block;
  if (block.type !== "paragraph") return;
  const meaningful = block.children.filter(
    (node) => node.type !== "text" || node.value.trim()
  );
  return meaningful.length === 1 ? meaningful[0] : undefined;
}
