import type {
  MdastNode,
  MdxJsxAttributeUnion,
  MdxJsxAttributeNode,
} from "satteri";

import { parse, type Program } from "acorn";

export interface ExternalLinkCandidate {
  readonly href: string;
  readonly attributes: readonly MdxJsxAttributeUnion[];
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
function literalString(
  value: MdxJsxAttributeNode["value"]
): string | undefined {
  if (typeof value === "string") return value;
  if (
    !value ||
    typeof value !== "object" ||
    !("value" in value) ||
    typeof value.value !== "string"
  )
    return;
  try {
    // Native MDX supplies ESTree. The fallback accommodates adapters without it.
    const program =
      (value.data as { estree?: Program } | undefined)?.estree ??
      parse(value.value, { ecmaVersion: "latest" });
    const statement = program.body[0];
    if (program.body.length !== 1 || statement?.type !== "ExpressionStatement")
      return;
    const expression = statement.expression;
    if (expression.type === "Literal" && typeof expression.value === "string")
      return expression.value;
    if (
      expression.type === "TemplateLiteral" &&
      expression.expressions.length === 0
    )
      return expression.quasis[0]?.value.cooked ?? undefined;
  } catch {
    return undefined;
  }
  return undefined;
}

const identifier = (value: string) =>
  value.trim().replace(/\s+/g, " ").toUpperCase();

export function collectDefinitions(
  root: Readonly<MdastNode>
): ReadonlyMap<
  string,
  { readonly url: string; readonly title?: string | null }
> {
  const definitions = new Map<
    string,
    { readonly url: string; readonly title?: string | null }
  >();
  function walk(node: Readonly<MdastNode>) {
    if (
      node.type === "definition" &&
      !definitions.has(identifier(node.identifier))
    )
      definitions.set(identifier(node.identifier), {
        url: node.url,
        title: node.title,
      });
    if ("children" in node) node.children.forEach(walk);
  }
  walk(root);
  return definitions;
}

/** Parser-specific provenance stays here; core policy never inspects source spelling. */
export function normalizeExternalLinkCandidate(
  node: Readonly<MdastNode>,
  definitions: ReadonlyMap<
    string,
    { readonly url: string; readonly title?: string | null }
  >
): ExternalLinkCandidate | undefined {
  let href: string | undefined;
  let attributes: readonly MdxJsxAttributeUnion[] = [];
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
    const definition = definitions.get(identifier(node.identifier));
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
  block: Readonly<MdastNode>
): Readonly<MdastNode> | undefined {
  if (block.type === "mdxJsxFlowElement") return block;
  if (block.type !== "paragraph") return;
  const meaningful = block.children.filter(
    (node) => node.type !== "text" || node.value.trim()
  );
  return meaningful.length === 1 ? meaningful[0] : undefined;
}
