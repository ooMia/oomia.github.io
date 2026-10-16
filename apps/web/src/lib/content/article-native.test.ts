import type { Root, RootContent } from "hast";

import { satteri } from "@workspace/md";
import { fromHtml } from "hast-util-from-html";
import { expect, test } from "vite-plus/test";

import {
  nativeArticlePresentation,
  nativeCodeSources,
  rehypeArticlePresentation,
} from "./article-native";

test("native sources survive footnote relocation, raw HTML, duplicate code, nesting and empty blocks", async () => {
  const renderer = await satteri({
    mdastPlugins: [nativeCodeSources],
    hastPlugins: [nativeArticlePresentation],
  }).createRenderer({});
  const result = await renderer.render(
    [
      "Reference[^code].",
      "",
      "[^code]:",
      "    ```js",
      "    same",
      "    ",
      "    ```",
      "",
      "<pre><code>raw HTML</code></pre>",
      "",
      "```js",
      "same",
      "```",
      "",
      "```js",
      "same",
      "",
      "```",
      "",
      "> ```js",
      "> nested",
      ">",
      "> ```",
      "",
      "```text",
      "```",
    ].join("\n")
  );
  const sources: string[] = [];
  const tree = fromHtml(result.code, { fragment: true });
  function textContent(node: RootContent): string {
    return node.type === "text"
      ? node.value
      : "children" in node
        ? node.children.map(textContent).join("")
        : "";
  }
  function walk(node: RootContent) {
    if (node.type !== "element") return;
    if (Object.hasOwn(node.properties, "dataCodeSource"))
      sources.push(textContent(node));
    node.children.forEach(walk);
  }
  tree.children.forEach(walk);
  expect(sources).toEqual(["same", "same\n", "nested\n", "", "same\n"]);
  // Only normalized values need duplicate static source text.
  expect(result.code.match(/<details\b[^>]*\bhidden/g)).toHaveLength(3);
  expect(result.code).toContain("<pre><code>raw HTML</code></pre>");
  expect(result.code).not.toContain("data-article-code-source");
});

test("MDX JSX containers retain native code and table presentation", async () => {
  const tree: Root = {
    type: "root",
    children: [
      {
        type: "mdxJsxFlowElement",
        name: "section",
        attributes: [],
        children: [
          {
            type: "element",
            tagName: "pre",
            properties: {},
            children: [
              {
                type: "element",
                tagName: "code",
                properties: {},
                children: [{ type: "text", value: "nested code" }],
              },
            ],
          },
          { type: "element", tagName: "table", properties: {}, children: [] },
        ],
      },
    ],
  };
  const container = tree.children[0];
  await rehypeArticlePresentation()(tree, { path: "nested.mdx" });
  expect(container).toMatchObject({
    type: "mdxJsxFlowElement",
    name: "section",
    children: [
      {
        type: "element",
        tagName: "figure",
        properties: { dataNativeCode: true },
      },
      {
        type: "element",
        tagName: "div",
        properties: { dataNativeTable: true },
      },
    ],
  });
});
