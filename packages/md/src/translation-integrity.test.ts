import { describe, expect, it } from "vite-plus/test";

import { assertTranslationIntegrity } from "./translation-integrity";

describe("native translation integrity", () => {
  const original = `---
title: 원문
description: 요약
---
# 제목

본문 [링크](https://example.com/a\\(b\\) "제목")와 \`some  code\`.

![설명](https://example.com/image.png)

[참조][r]

[r]: <https://example.com/reference> "제목"

~~~ts title="example"
const result = "  한글 code";
~~~
`;
  const translated = original
    .replace("title: 원문", "title: Original")
    .replace("description: 요약", "description: Summary")
    .replace("# 제목", "# Heading")
    .replace("본문", "Body")
    .replace("[링크]", "[Link]")
    .replace("[설명]", "[Description]")
    .replace("[참조]", "[Reference]")
    .replaceAll('"제목"', '"Title"');

  it("accepts translated prose, frontmatter and labels without compiling code", () => {
    expect(() =>
      assertTranslationIntegrity(original, translated, "md")
    ).not.toThrow();
  });

  it.each([
    ['"  한글 code"', '" 한글 code"'],
    ["some  code", "some code"],
    ["https://example.com/image.png", "https://example.com/other.png"],
    ["https://example.com/reference", "https://example.com/changed"],
    ["a\\(b\\)", "a(b)"],
  ])("rejects a changed protected source token %s", (before, after) => {
    expect(() =>
      assertTranslationIntegrity(
        original,
        translated.replace(before, after),
        "md"
      )
    ).toThrow("protected");
  });

  it("uses native MDX syntax and preserves component props, expressions and code", () => {
    const source = `<Callout type="info" title="Keep title">한글 **본문** \`code\`</Callout>\n\n<a href={'https://example.com'}>링크</a>\n\n{value}\n`;
    const translatedMdx = source
      .replace("한글 **본문**", "English **body**")
      .replace("링크", "Link");
    expect(() =>
      assertTranslationIntegrity(source, translatedMdx, "mdx")
    ).not.toThrow();
    expect(() =>
      assertTranslationIntegrity(
        source,
        translatedMdx.replace('type="info"', 'type="warn"'),
        "mdx"
      )
    ).toThrow("protected");
    expect(() =>
      assertTranslationIntegrity(
        source,
        translatedMdx.replace("{value}", "{fetch('/api')}"),
        "mdx"
      )
    ).toThrow("protected");
    expect(() =>
      assertTranslationIntegrity(
        source,
        translatedMdx.replace("https://example.com", "https://other.example"),
        "mdx"
      )
    ).toThrow("protected");
  });

  it("retains code in nested grammar contexts and permits link label punctuation", () => {
    const source =
      "> ```js\n> const a = 1;\n> ```\n\n[**label [nested]**](../A%20B.md)";
    const translation = source.replace("label [nested]", "translated [nested]");
    expect(() =>
      assertTranslationIntegrity(source, translation, "md")
    ).not.toThrow();
    expect(() =>
      assertTranslationIntegrity(
        source,
        translation.replace("a = 1", "a = 2"),
        "md"
      )
    ).toThrow("protected");
  });

  it("handles code-span brackets in labels without interpreting them as URL delimiters", () => {
    const source = "[한글 `]` label](https://example.com/one(two))";
    const translatedLabel = source.replace("한글", "English");
    expect(() =>
      assertTranslationIntegrity(source, translatedLabel, "md")
    ).not.toThrow();
  });

  it("reports native/reference/HTML and MDX media destinations for the consumer", () => {
    const source =
      '![alt](../photo.png)\n\n![other][image]\n\n[image]: ../reference.png\n\n<img src="../raw.png">';
    expect(
      assertTranslationIntegrity(source, source, "md").imageSources
    ).toEqual(["../photo.png", "../raw.png", "../reference.png"]);
    const jsx = '<img src="../jsx.png" />';
    expect(assertTranslationIntegrity(jsx, jsx, "mdx").imageSources).toEqual([
      "../jsx.png",
    ]);
    const dynamic = "<img src={photo} />";
    expect(() => assertTranslationIntegrity(dynamic, dynamic, "mdx")).toThrow(
      "Dynamic"
    );
  });

  it.each([
    ["md", "[다음](#시작)"],
    ["md", "[다음][section]\n\n[section]: #시작"],
    ["md", '<a href="#시작">다음</a>'],
    ["mdx", "[다음](#시작)"],
    ["mdx", '<a href="#시작">다음</a>'],
    ["mdx", "<a href={'#시작'}>다음</a>"],
  ] as const)(
    "rejects %s local fragments whose target can change with translated headings",
    (format, link) => {
      const source = `## 시작\n\n${link}\n`;
      const translation = source
        .replace("## 시작", "## Start")
        .replace("다음", "Next");
      expect(() =>
        assertTranslationIntegrity(source, translation, format)
      ).toThrow("local fragment");
    }
  );

  it("retains external URL fragments and the native top-of-page link", () => {
    const source =
      '[외부](https://example.com/article#section) [맨 위](#)\n\n<a href={"https://example.com/article#section"}>외부</a>';
    const translation = source
      .replaceAll("외부", "External")
      .replace("맨 위", "Top");
    expect(() =>
      assertTranslationIntegrity(source, translation, "mdx")
    ).not.toThrow();
  });

  it("rejects a dynamic MDX link destination that cannot prove fragment preservation", () => {
    const source = "## 시작\n\n<a href={target}>다음</a>";
    const translation = source
      .replace("## 시작", "## Start")
      .replace("다음", "Next");
    expect(() =>
      assertTranslationIntegrity(source, translation, "mdx")
    ).toThrow("Dynamic translation link destinations");
  });
});
