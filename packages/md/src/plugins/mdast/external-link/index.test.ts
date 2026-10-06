import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { describe, expect, test, vi } from "vite-plus/test";

import externalLink from ".";
import { standaloneLinkContent, type ExternalLinkCandidate } from "./normalize";

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
      standaloneLinkContent({
        type: "paragraph",
        children: [{ type: "text", value: " " }, link],
      })
    ).toBe(link);
    expect(
      standaloneLinkContent({
        type: "paragraph",
        children: [link, { type: "text", value: "Sentence" }],
      })
    ).toBeUndefined();
  });
});
