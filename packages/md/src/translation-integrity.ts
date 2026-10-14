import type { Features } from "satteri";

import { parseFrontmatter } from "@astrojs/markdown-remark";
import { createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { htmlToHast, markdownToMdast } from "satteri";

interface SourceNode {
  type: string;
  url?: string;
  identifier?: string;
  name?: string | null;
  children?: SourceNode[];
  attributes?: { type: string; name?: string; value?: unknown }[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

interface HtmlNode {
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HtmlNode[];
}

function assertSupportedLinkDestination(value: string) {
  const destination = value.trim();
  if (destination.startsWith("#") && destination.length > 1)
    throw new Error(
      "Translation local fragment links require a preserved heading target resolver"
    );
}

function jsxLinkDestination(value: unknown) {
  if (typeof value === "string") return value;
  // Native MDX has already parsed attribute expressions. Inspect its ESTree;
  // never evaluate an expression to discover a navigation destination.
  const expression = (
    value as {
      data?: {
        estree?: {
          body?: { expression?: { type?: string; value?: unknown } }[];
        };
      };
    } | null
  )?.data?.estree?.body?.[0]?.expression;
  if (expression?.type === "Literal" && typeof expression.value === "string")
    return expression.value;
  throw new Error(
    "Dynamic translation link destinations require an explicit target resolver"
  );
}

function htmlAssetSources(raw: string): string[] {
  const sources: string[] = [];
  const visit = (node: HtmlNode) => {
    const href = node.properties?.["href"];
    if (node.tagName === "a" && typeof href === "string")
      assertSupportedLinkDestination(href);
    if (node.properties?.["srcSet"] || node.properties?.["srcset"])
      throw new Error(
        "Translation srcset assets require an explicit asset resolver"
      );
    for (const name of [
      "src",
      "poster",
      ...(node.tagName === "object" ? ["data"] : []),
      ...(node.tagName === "image" ? ["href", "xLinkHref"] : []),
    ]) {
      const value = node.properties?.[name];
      if (typeof value === "string") sources.push(value);
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(htmlToHast(raw, { fragment: true }) as HtmlNode);
  return sources;
}

/** Read the authored destination only after the native parser identifies a URL node. */
function rawDestination(node: SourceNode, raw: string) {
  if (raw.startsWith("<") || (!raw.startsWith("[") && !raw.startsWith("![")))
    return raw; // Native/GFM autolinks retain their complete authored bytes.
  let depth = 0;
  let cursor = raw.startsWith("!") ? 1 : 0;
  for (; cursor < raw.length; cursor++) {
    if (raw[cursor] === "\\") {
      cursor++;
      continue;
    }
    // A bracket inside an inline code label does not close the native link label.
    if (raw[cursor] === "`") {
      let end = cursor + 1;
      while (raw[end] === "`") end++;
      const delimiter = raw.slice(cursor, end);
      const close = raw.indexOf(delimiter, end);
      if (close !== -1) {
        cursor = close + delimiter.length - 1;
        continue;
      }
    }
    if (raw[cursor] === "[") depth++;
    if (raw[cursor] === "]" && --depth === 0) break;
  }
  cursor++;
  if (node.type === "definition") {
    if (raw[cursor] !== ":")
      throw new Error("Missing native URL source position");
  } else if (raw[cursor] !== "(") {
    throw new Error("Missing native URL source position");
  }
  cursor++;
  while (/\s/.test(raw[cursor] ?? "")) cursor++;
  const start = cursor;
  if (raw[cursor] === "<") {
    for (cursor++; cursor < raw.length; cursor++) {
      if (raw[cursor] === "\\") {
        cursor++;
        continue;
      }
      if (raw[cursor] === ">") return raw.slice(start, cursor + 1);
    }
    throw new Error("Missing native URL source position");
  }
  depth = 0;
  for (; cursor < raw.length; cursor++) {
    if (raw[cursor] === "\\") {
      cursor++;
      continue;
    }
    if (raw[cursor] === "(") depth++;
    else if (raw[cursor] === ")") {
      if (depth === 0) break;
      depth--;
    } else if (/\s/.test(raw[cursor] ?? "") && depth === 0) break;
  }
  return raw.slice(start, cursor);
}

function openingTag(raw: string) {
  let quote: string | undefined;
  let braces = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (quote) {
      if (c === quote) quote = undefined;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{") braces++;
    else if (c === "}") braces--;
    else if (c === ">" && braces === 0) return raw.slice(0, i + 1);
  }
  throw new Error("Missing native JSX source position");
}

function protectedTokens(
  source: string,
  format: "md" | "mdx",
  features?: Features
) {
  // Astro owns frontmatter parsing; keep its source offsets for raw byte checks.
  const content = parseFrontmatter(source, {
    frontmatter: "empty-with-spaces",
  }).content;
  const root = (
    format === "md"
      ? markdownToMdast(content, {
          ...(features ? { features } : {}),
          position: true,
        })
      : createProcessor({ remarkPlugins: [remarkGfm] }).parse(content)
  ) as SourceNode;
  const tokens: string[] = [];
  const imageSources: string[] = [];
  const references: string[] = [];
  const definitions = new Map<string, string>();
  const visit = (node: SourceNode) => {
    const slice = () => {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start === undefined || end === undefined)
        throw new Error("Missing native translation token position");
      return source.slice(start, end);
    };
    if (
      [
        "code",
        "inlineCode",
        "math",
        "inlineMath",
        "html",
        "mdxFlowExpression",
        "mdxTextExpression",
        "mdxjsEsm",
      ].includes(node.type)
    ) {
      const raw = slice();
      tokens.push(`${node.type}:${raw}`);
      if (node.type === "html") imageSources.push(...htmlAssetSources(raw));
    } else if (["link", "image", "definition"].includes(node.type)) {
      if (node.type !== "image" && node.url)
        assertSupportedLinkDestination(node.url);
      tokens.push(
        `${node.type}:${node.url ?? ""}:${rawDestination(node, slice())}`
      );
      if (node.type === "image" && node.url) imageSources.push(node.url);
      if (node.type === "definition") {
        tokens.push(`reference:${node.identifier ?? ""}`);
        if (node.identifier && node.url && !definitions.has(node.identifier))
          definitions.set(node.identifier, node.url);
      }
    } else if (
      [
        "linkReference",
        "imageReference",
        "footnoteReference",
        "footnoteDefinition",
      ].includes(node.type)
    ) {
      tokens.push(`${node.type}:${node.identifier ?? ""}`);
      if (node.type === "imageReference" && node.identifier)
        references.push(node.identifier);
    } else if (
      node.type === "mdxJsxFlowElement" ||
      node.type === "mdxJsxTextElement"
    ) {
      const raw = slice();
      const open = openingTag(raw);
      const close = open.endsWith("/>") ? "" : raw.slice(raw.lastIndexOf("</"));
      tokens.push(`${node.type}:${open}:${close}`);
      for (const attribute of node.attributes ?? []) {
        if (attribute.name === "href") {
          assertSupportedLinkDestination(jsxLinkDestination(attribute.value));
        } else if (attribute.name === "src" || attribute.name === "poster") {
          // Dynamic assets need a source-relative resolver, unavailable in v1.
          if (typeof attribute.value !== "string")
            throw new Error(
              "Dynamic translation asset references are unsupported"
            );
          imageSources.push(attribute.value);
        } else if (attribute.name === "srcSet" || attribute.name === "srcset") {
          throw new Error(
            "Translation srcset assets require an explicit asset resolver"
          );
        }
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(root);
  for (const reference of references) {
    const url = definitions.get(reference);
    if (url) imageSources.push(url);
  }
  return { tokens, imageSources };
}

/** Parse-only integrity check. It does not render, compile or evaluate a document. */
export function assertTranslationIntegrity(
  original: string,
  translation: string,
  format: "md" | "mdx",
  features?: Features
) {
  const expected = protectedTokens(original, format, features);
  const actual = protectedTokens(translation, format, features);
  if (JSON.stringify(expected.tokens) !== JSON.stringify(actual.tokens))
    throw new Error(
      "Translation changed protected code, URL or component syntax"
    );
  return { imageSources: expected.imageSources };
}
