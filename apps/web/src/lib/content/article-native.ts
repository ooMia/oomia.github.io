import type { HastPluginEntry, MdastPluginEntry } from "@workspace/md";
import type {
  Element,
  ElementContent,
  Properties,
  Root,
  RootContent,
} from "hast";

import { renderMermaid } from "./mermaid";

/** Preserve parser-owned code values before the native highlighter normalizes them. */
export const nativeCodeSources: MdastPluginEntry = {
  name: "article-native-code-sources",
  code(node, ctx) {
    // A custom wrapper follows its code even when native rendering relocates it
    // (for example, a GFM footnote). The HAST pass replaces the whole wrapper.
    ctx.wrapNode(node, {
      type: "articleCode",
      children: [],
      data: {
        hName: "div",
        hProperties: { dataArticleCodeSource: node.value },
      },
    });
  },
};

const text = (value: string): ElementContent => ({ type: "text", value });
const element = (
  tagName: string,
  properties: Properties,
  children: ElementContent[]
): Element => ({ type: "element", tagName, properties, children });
function textContent(node: RootContent): string {
  if (node.type === "text") return node.value;
  return "children" in node ? node.children.map(textContent).join("") : "";
}
function copyElement(node: Element): Element {
  return element(
    node.tagName,
    { ...node.properties },
    node.children.map(copyContent)
  );
}
function copyContent(node: ElementContent): ElementContent {
  switch (node.type) {
    case "element":
      return copyElement(node);
    case "text":
      return { type: "text", value: node.value };
    case "comment":
      return { type: "comment", value: node.value };
    case "raw":
      return { type: "raw", value: node.value };
    default:
      throw new Error(`Unexpected native Markdown node: ${node.type}`);
  }
}
function language(pre: Element, code: Element) {
  const classes = code.properties.className;
  return String(
    pre.properties["dataLanguage"] ??
      pre.properties["data-language"] ??
      (Array.isArray(classes) ? classes : String(classes ?? "").split(/\s+/))
        .find((value) => String(value).startsWith("language-"))
        ?.toString()
        .slice(9) ??
      ""
  );
}
function ui(ko: string, en: string) {
  return [
    element(
      "span",
      {
        className: ["article-ui-ko"],
      },
      [text(ko)]
    ),
    element(
      "span",
      {
        className: ["article-ui-en"],
      },
      [text(en)]
    ),
  ];
}
function toolbar(label: string) {
  return element("figcaption", { className: ["article-code-toolbar"] }, [
    element("span", {}, label ? [text(label)] : ui("코드", "Code")),
    element("button", { type: "button", disabled: true, dataCodeCopy: true }, [
      element("span", { dataCopyLabel: "idle" }, ui("코드 복사", "Copy code")),
      element("span", { dataCopyLabel: "copied" }, ui("복사됨", "Copied")),
    ]),
    element(
      "span",
      { className: ["sr-only"], role: "status", dataCopyStatus: true },
      []
    ),
  ]);
}
function codeFrame(
  pre: Element,
  code: Element,
  label: string,
  original?: string
) {
  // Keep native Shiki output unchanged. Markdown needs a separate source because
  // its highlighter trims an authored LF in addition to the fence delimiter.
  const needsSource = original !== undefined && original !== textContent(code);
  if (!needsSource)
    code.properties = { ...code.properties, dataCodeSource: true };
  return element(
    "figure",
    {
      className: ["article-code-frame", "not-prose"],
      dataNativeCode: true,
      dataScrollSurface: "code",
    },
    [
      toolbar(label),
      pre,
      ...(!needsSource
        ? []
        : [
            element(
              "details",
              { className: ["article-mermaid-source"], hidden: true },
              [
                element("summary", {}, ui("원문 보기", "View source")),
                element("pre", {}, [
                  element("code", { dataCodeSource: true }, [text(original)]),
                ]),
              ]
            ),
          ]),
    ]
  );
}
function tableFrame(table: Element) {
  const caption = table.children.find(
    (node): node is Element =>
      node.type === "element" && node.tagName === "caption"
  );
  return element(
    "div",
    {
      className: ["article-table-scroll"],
      dataNativeTable: true,
      dataScrollSurface: "paper",
      tabIndex: 0,
      role: "region",
      ariaLabel: caption
        ? textContent(caption)
        : "스크롤 가능한 표 / Scrollable table",
    },
    [table]
  );
}

async function enhance(node: Element, file: string, original?: string) {
  if (node.tagName === "table") return tableFrame(node);
  const code = node.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "code"
  );
  if (!code) return node;
  const label = language(node, code);
  if (label.toLowerCase() !== "mermaid")
    return codeFrame(node, code, label, original);
  // Native fence conversion adds a terminating LF. Remove only that LF,
  // preserving all authored indentation, blank lines and trailing spaces.
  const source = original ?? textContent(code).replace(/\n$/, "");
  try {
    const diagram = await renderMermaid(source);
    return element(
      "figure",
      {
        className: ["article-mermaid", "not-prose"],
        dataNativeCode: true,
        dataMermaid: true,
      },
      [
        toolbar("Mermaid"),
        element(
          "div",
          {
            className: ["article-mermaid-diagram"],
            dataScrollSurface: "paper",
          },
          [
            element(
              "img",
              {
                ...diagram.light,
                alt: diagram.alt,
                dataMermaidTheme: "light",
              },
              []
            ),
            element(
              "img",
              { ...diagram.dark, alt: diagram.alt, dataMermaidTheme: "dark" },
              []
            ),
          ]
        ),
        element("details", { className: ["article-mermaid-source"] }, [
          element("summary", {}, ui("원문 보기", "View source")),
          element("pre", {}, [
            element("code", { dataCodeSource: true }, [text(source)]),
          ]),
        ]),
      ]
    );
  } catch (error) {
    throw new Error(
      `Mermaid rendering failed in ${file}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

/** Sätteri applies this after its own native highlighter. */
export const nativeArticlePresentation: HastPluginEntry = {
  name: "article-native-presentation",
  element: {
    filter: ["div", "table"],
    async visit(node, ctx) {
      const file = ctx.fileURL?.pathname ?? "Markdown";
      if (node.tagName === "table") return enhance(copyElement(node), file);
      const original = node.properties["dataArticleCodeSource"];
      if (typeof original !== "string") return;
      const pre = node.children.find(
        (child): child is Element =>
          child.type === "element" && child.tagName === "pre"
      );
      if (!pre)
        throw new Error(`Native code wrapper has no pre element in ${file}`);
      // Copy only standard HAST fields before structural mutations enter NAPI.
      return enhance(copyElement(pre), file, original);
    },
  },
};

/** MDX uses the same HAST transform after its native Shiki pass. */
export function rehypeArticlePresentation() {
  return async (tree: Root, file: { path?: string }) => {
    async function walk(
      parent: Root | Extract<RootContent, { children: unknown[] }>
    ) {
      for (let i = 0; i < parent.children.length; i++) {
        const node = parent.children[i];
        if (!node) continue;
        // Markdown blocks can be children of an authored MDX JSX container.
        if (node.type !== "element") {
          if ("children" in node) await walk(node);
          continue;
        }
        if (
          node.properties["dataNativeCode"] ||
          node.properties["dataNativeTable"]
        )
          continue;
        if (node.tagName === "pre" || node.tagName === "table") {
          parent.children[i] = await enhance(node, file.path ?? "MDX");
        } else await walk(node);
      }
    }
    await walk(tree);
  };
}
