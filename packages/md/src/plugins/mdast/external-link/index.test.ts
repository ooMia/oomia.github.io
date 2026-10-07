import type { Root } from "mdast";

import { compile, createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { describe, expect, test, vi } from "vite-plus/test";

import externalLink from ".";
import {
  normalizeExternalLinkCandidate,
  standaloneLinkContent,
  type ExternalLinkCandidate,
} from "./normalize";

const href = "https://example.com/article";
const target = () =>
  vi.fn((_candidate: ExternalLinkCandidate) => ({
    type: "mdxJsxFlowElement" as const,
    name: "LinkCard",
    attributes: [],
    children: [],
  }));

describe("standard MDX external link normalization", () => {
  test.each([
    `[Label](${href})`,
    `[**Label**](${href} "Author tooltip")`,
    `[Label][REF]\n\n[ref]: ${href}`,
    `[REF][]\n\n[ref]: ${href}`,
    `[REF]\n\n[ref]: ${href}`,
    `<a href="${href}">Label</a>`,
    `<a href={'${href}'}>Label</a>`,
    `<a href={("${href}")}>Label</a>`,
    `<a href={\`https://example.com/article\`}>Label</a>`,
    `<a href="${href}">\nLabel\n</a>`,
    `<a\n href="${href}"\n>Label</a>`,
    `> [Label](${href})`,
    `- [Label](${href})`,
    `> <a href="${href}">Label</a>`,
    `- <a href="${href}">Label</a>`,
    `[Label][a  b]\n\n[A\tB]: ${href}`,
    `[Label][Straße]\n\n[STRASSE]: ${href}`,
    `[Label][réf]\n\n[RÉF]: ${href}`,
    `[](${href})`,
  ])("offers the same normalized candidate for %s", async (source) => {
    const renderTarget = target();
    const result = await compile(source, {
      remarkPlugins: [remarkGfm, externalLink(renderTarget)],
    });
    expect(renderTarget).toHaveBeenCalledTimes(1);
    expect(renderTarget.mock.calls[0]?.[0]).toMatchObject({ href });
    expect(String(result)).toContain("LinkCard");
  });
  test.each([
    `Inline [Label](${href}) sentence`,
    `Inline <a href="${href}">Label</a> sentence`,
    `[One](${href}) [Two](${href})`,
    "[Local](/local)",
    "[Email](mailto:author@example.com)",
    "[Unsafe](https://user:password@example.com)",
    href,
    "www.example.com",
    `[[${href}]]`,
    `:link[Label]{href="${href}"}`,
    `<A href="${href}">Component</A>`,
    `<a href={getUrl()}>Dynamic</a>`,
    `<a {...props} href="${href}">Spread</a>`,
    `<div><a href="${href}">Nested</a></div>`,
    "[Missing][ref]",
    `<a href="${href}" href="https://example.com/other">Duplicate</a>`,
    `<a href={\`https://example.com/${"${id}"}\`}>Interpolated</a>`,
    `| Link |\n| --- |\n| [Label](${href}) |`,
    `Footnote[^ref]\n\n[^ref]: [Label](${href})`,
    `Footnote[^ref]\n\n[^ref]: > [Label](${href})`,
    `\`[Code](${href})\``,
  ])("does not enhance %s", async (source) => {
    const renderTarget = target();
    await compile(source, {
      remarkPlugins: [remarkGfm, externalLink(renderTarget)],
    });
    expect(renderTarget).not.toHaveBeenCalled();
  });
  test("declined metadata leaves the native MDX link and authored children", async () => {
    const result = await compile(`[**Label**](${href})`, {
      remarkPlugins: [externalLink(() => undefined)],
    });
    expect(String(result)).not.toContain("LinkCard");
    expect(String(result)).toContain(href);
    expect(String(result)).toContain("strong");
  });
  test("reference definitions preserve their first matching title and URL", async () => {
    const renderTarget = target();
    await compile(
      `[Read][ref]\n\n[ref]: ${href} "Authored tooltip"\n[REF]: https://example.com/other`,
      { remarkPlugins: [externalLink(renderTarget)] }
    );
    expect(renderTarget.mock.calls[0]?.[0]).toMatchObject({
      href,
      attributes: [{ name: "title", value: "Authored tooltip" }],
    });
  });
  test("preserves JSX navigation attributes on the normalized target", async () => {
    const renderTarget = target();
    await compile(
      `<a href="${href}" target="_blank" rel="noopener" className="authored">Label</a>`,
      { remarkPlugins: [externalLink(renderTarget)] }
    );
    expect(renderTarget.mock.calls[0]?.[0]).toMatchObject({
      attributes: [
        { name: "target", value: "_blank" },
        { name: "rel", value: "noopener" },
        { name: "className", value: "authored" },
      ],
    });
  });
  test("standalone policy tolerates whitespace but requires exactly one meaningful node", () => {
    const link = { type: "link" as const, url: href, children: [] };
    expect(
      standaloneLinkContent(
        {
          type: "paragraph",
          children: [{ type: "text", value: " " }, link],
        },
        { type: "root", children: [] }
      )
    ).toBe(link);
    expect(
      standaloneLinkContent(
        {
          type: "paragraph",
          children: [link, { type: "text", value: "Sentence" }],
        },
        { type: "root", children: [] }
      )
    ).toBeUndefined();
  });
  test.each([
    "../SomeFile.md",
    "../한글/Pattern.md",
    "/Foo/Bar",
    "../Some%20File.md",
  ])(
    "leaves internal destination %s untouched in native nodes",
    async (url) => {
      let destinations: string[] = [];
      const renderTarget = target();
      await compile(`[Direct](${url})\n\n[Reference][ref]\n\n[ref]: ${url}`, {
        remarkPlugins: [
          externalLink(renderTarget),
          () => (root: Root) => {
            destinations = root.children.flatMap((node) =>
              node.type === "definition"
                ? [node.url]
                : node.type === "paragraph"
                  ? node.children.flatMap((child) =>
                      child.type === "link" ? [child.url] : []
                    )
                  : []
            );
          },
        ],
      });
      expect(renderTarget).not.toHaveBeenCalled();
      expect(destinations).toEqual([url, url]);
    }
  );
  test("declines expression href without parser ESTree", () => {
    expect(
      normalizeExternalLinkCandidate(
        {
          type: "mdxJsxFlowElement",
          name: "a",
          children: [],
          attributes: [
            {
              type: "mdxJsxAttribute",
              name: "href",
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `'${href}'`,
              },
            },
          ],
        },
        () => undefined
      )
    ).toBeUndefined();
  });
  test("uses WHATWG URL semantics for external destinations", async () => {
    const renderTarget = target();
    const url = "HTTPS://도메인.example:443/한글";
    await compile(`[Label](${url})`, {
      remarkPlugins: [externalLink(renderTarget)],
    });
    expect(renderTarget.mock.calls[0]?.[0].href).toBe(new URL(url).href);
  });
  test("actual parser context shapes keep table and footnote links separate", () => {
    const processor = createProcessor({ remarkPlugins: [remarkGfm] });
    const root = processor.parse(
      `> [Quote](${href})\n\n- [List](${href})\n\n| Link |\n| --- |\n| [Cell](${href}) |\n\nFootnote[^ref]\n\n[^ref]: [Footnote](${href})`
    );
    expect(root.children.map((node) => node.type)).toEqual([
      "blockquote",
      "list",
      "table",
      "paragraph",
      "footnoteDefinition",
    ]);
    const quote = root.children[0];
    const list = root.children[1];
    const table = root.children[2];
    const footnote = root.children[4];
    expect(quote?.type === "blockquote" && quote.children[0]?.type).toBe(
      "paragraph"
    );
    expect(list?.type === "list" && list.children[0]?.children[0]?.type).toBe(
      "paragraph"
    );
    expect(
      table?.type === "table" &&
        table.children[1]?.children[0]?.children[0]?.type
    ).toBe("link");
    expect(
      footnote?.type === "footnoteDefinition" && footnote.children[0]?.type
    ).toBe("paragraph");
  });
});
