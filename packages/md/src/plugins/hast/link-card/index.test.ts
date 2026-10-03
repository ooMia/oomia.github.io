import { markdownToHtml } from "satteri";
import { describe, expect, test } from "vite-plus/test";

import linkCard, { type LinkCardResolver } from ".";

const url = "https://example.com/article";

const resolve: LinkCardResolver = (value) =>
  value === url
    ? {
        url,
        title: "Example article",
        description: "Example description",
        siteName: "Example",
      }
    : undefined;

function render(source: string): string {
  return markdownToHtml(source, {
    features: { gfm: true },
    hastPlugins: [linkCard(resolve)],
  }).html;
}

describe("link card", () => {
  test("renders a metadata-backed autolink paragraph as a card", () => {
    const html = render(`<${url}>`);

    expect(html).toContain('class="link-card"');
    expect(html).toContain('data-link-card="true"');
    expect(html).toContain("Example article");
    expect(html).toContain("Example description");
    expect(html).toContain("Example");
  });

  test("renders a standalone Markdown link as a card", () => {
    const html = render(`[Read more](${url})`);

    expect(html).toContain('class="link-card"');
    expect(html).toContain("Example article");
  });

  test("keeps an inline external link as an ordinary anchor", () => {
    const html = render(`Read [this article](${url}) for details.`);

    expect(html).not.toContain('class="link-card"');
    expect(html).toContain(`href="${url}"`);
    expect(html).toContain("this article");
  });

  test("keeps a standalone link without metadata as an ordinary anchor", () => {
    const html = render("<https://example.org/unknown>");

    expect(html).not.toContain('class="link-card"');
    expect(html).toContain('href="https://example.org/unknown"');
  });

  test("keeps an internal link as an ordinary anchor", () => {
    const html = render("[Local](/articles/local)");

    expect(html).not.toContain('class="link-card"');
    expect(html).toContain('href="/articles/local"');
  });

  test("renders with only the required metadata", () => {
    const minimal = linkCard((value) =>
      value === url ? { url, title: "Minimal" } : undefined
    );

    const html = markdownToHtml(`<${url}>`, {
      hastPlugins: [minimal],
    }).html;

    expect(html).toContain('class="link-card"');
    expect(html).toContain("Minimal");
  });
});
