import { markdownToHtml } from "satteri";
import { describe, expect, test, vi } from "vite-plus/test";

import linkCard from ".";

describe("standalone external-link semantics", () => {
  test("only paragraph-singleton HTTP(S) anchors are offered to Site", async () => {
    const target = vi.fn((_href: string) => undefined);
    await markdownToHtml(
      "<https://example.com/card>\n\nInline [link](https://example.com/inline) text.\n\n[Local](/local)\n\n[Email](mailto:test@example.com)\n\n[One](https://example.com/one) [Two](https://example.com/two)\n\n```md\n<https://example.com/code>\n```",
      { hastPlugins: [linkCard(target)] }
    );
    expect(target).toHaveBeenCalledTimes(1);
    expect(target.mock.calls[0]?.[0]).toBe("https://example.com/card");
  });
  test("Site can decline projection or supply its own target without plugin markup", async () => {
    const fallback = await markdownToHtml("<https://example.com/card>", {
      hastPlugins: [linkCard(() => undefined)],
    });
    expect(fallback.html).toContain('<a href="https://example.com/card">');
    const target = await markdownToHtml("<https://example.com/card>", {
      hastPlugins: [
        linkCard((href) => ({
          type: "element",
          tagName: "span",
          properties: { dataHref: href },
          children: [],
        })),
      ],
    });
    expect(target.html).toContain(
      '<span data-href="https://example.com/card"></span>'
    );
    expect(target.html).not.toContain("link-card");
  });
});
