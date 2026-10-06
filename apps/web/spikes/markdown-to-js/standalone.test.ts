import { readFileSync } from "node:fs";
import { createElement } from "react";
import { describe, expect, test, vi } from "vite-plus/test";

import { createLinkCardResolver } from "../../src/lib/content/link-card";
import { componentBinding } from "./binding";
import { compileAndRender } from "./compile";
import records from "./fixtures/manifest.json";

const binding = componentBinding(createLinkCardResolver(records));
const url = "https://example.com/article";
const options = { hastPlugins: [binding.plugin] };

describe("Sätteri plain Markdown component proof", () => {
  test("generated semantic target reaches Site component with escaped typed projection", async () => {
    const result = await compileAndRender(
      `<${url}>`,
      "markdown",
      options,
      binding.components
    );
    expect(result.html).toContain('data-link-card="component"');
    expect(result.html).toContain(
      "Fixture &lt;title&gt; &amp; &quot;quotes&quot; {literal}"
    );
    expect(result.html).not.toContain("DO NOT PROJECT");
    expect(result.code).toContain("LinkCard");
  });
  test("provider mapping works without a components prop", async () => {
    const result = await compileAndRender(
      `<${url}>`,
      "markdown",
      {
        ...options,
        providerImportSource: "spike-provider",
      },
      {},
      binding.components
    );
    expect(result.html).toContain('data-link-card="component"');
  });
  test("inline, internal, missing metadata and multiple-child paragraphs keep ordinary links", async () => {
    for (const source of [
      `Inline [link](${url}) text`,
      "[local](/local)",
      "<https://example.org/missing>",
      `<${url}> [other](${url})`,
    ]) {
      const { html } = await compileAndRender(
        source,
        "markdown",
        options,
        binding.components
      );
      expect(html).toContain("<a href=");
      expect(html).not.toContain("data-link-card");
    }
  });
  test("Markdown expressions/import/export do not execute; MDX expressions do", async () => {
    const source = "export const answer = 42\n\n{1 + 1}";
    const md = await compileAndRender(
      source,
      "markdown",
      options,
      binding.components
    );
    const mdx = await compileAndRender(
      source,
      "mdx",
      options,
      binding.components
    );
    expect(md.html).toContain("export const answer = 42");
    expect(md.html).toContain("{1 + 1}");
    expect(mdx.html).toBe("2");
  });
  test("raw HTML defaults drop markup; reparsing preserves HTML but is not sanitization", async () => {
    const source =
      '<div class="note">Readable {braces}</div>\n\n<script>alert("probe")</script>\n\n<img src="https://example.org/x" onerror="alert(1)">';
    const base = await compileAndRender(source, "markdown", {}, {});
    const raw = await compileAndRender(
      source,
      "markdown",
      { features: { rawHtml: true } },
      {}
    );
    expect(base.html).not.toContain("Readable");
    expect(raw.html).toContain('class="note"');
    expect(raw.html).toContain("Readable {braces}");
    expect(raw.html).toContain("<script>");
    // React drops string event handlers. This is renderer behavior, not a sanitizer.
    expect(raw.html).not.toContain("onerror=");
  });
  test("raw reparsing preserves iframe srcdoc and does not enable Markdown expressions", async () => {
    const source =
      '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>\n\n<div>{globalThis.__markdownSpikeProbe = true}</div>';
    const output = await compileAndRender(
      source,
      "markdown",
      { features: { rawHtml: true } },
      {}
    );
    expect(output.html).toContain("srcDoc=");
    expect(output.html).toContain("&lt;script&gt;");
    expect(output.html).toContain("{globalThis.__markdownSpikeProbe = true}");
    expect(Reflect.get(globalThis, "__markdownSpikeProbe")).toBeUndefined();
  });
  test("no target-page fetch occurs during compile/render", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("Network forbidden");
    });
    try {
      await compileAndRender(
        `<${url}>`,
        "markdown",
        options,
        binding.components
      );
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
  test("existing canonical Markdown and MDX corpus renders with readable semantic content", async () => {
    const base = new URL(
      "../../data/articles/content/articles/",
      import.meta.url
    );
    for (const [file, format, expected] of [
      ["tech/log/TDD-dev-flow.md", "markdown", "TDD"],
      ["tech/java/Pattern.md", "markdown", "Pattern"],
      [
        "tech/log/woowa-precourse-parameterized-test.mdx",
        "mdx",
        "ParameterizedTest",
      ],
    ] as const) {
      const source = readFileSync(new URL(file, base), "utf8");
      const result = await compileAndRender(
        source,
        format,
        { ...options, features: { rawHtml: true } },
        {
          ...binding.components,
          Callout: ({ children }: { children: import("react").ReactNode }) =>
            createElement("aside", {}, children),
        }
      );
      expect(result.html).toContain(expected);
      expect(result.html).toContain("<code");
    }
  });
});
