import type { Browser, BrowserType } from "@playwright/test";
import type { RootContent } from "hast";

import { chromium } from "@playwright/test";
import { fromHtml } from "hast-util-from-html";
import { createMermaidRenderer } from "mermaid-isomorphic";
import { createHash } from "node:crypto";

// The renderer needs local package files only. Block browser network traffic,
// including requests originating from authored Mermaid labels/configuration.
const offlineChromium = new Proxy(chromium, {
  get(target, key) {
    if (key === "launch")
      return async (options: Parameters<BrowserType["launch"]>[0]) => {
        const browser = await target.launch(options);
        return new Proxy(browser, {
          get(browserTarget, browserKey) {
            if (browserKey === "newContext")
              return async (
                contextOptions: Parameters<Browser["newContext"]>[0]
              ) => {
                const context = await browserTarget.newContext({
                  ...contextOptions,
                  serviceWorkers: "block",
                });
                await context.route(/^(?:https?|wss?):\/\//, (route) =>
                  route.abort()
                );
                await context.routeWebSocket(/.*/, (socket) => socket.close());
                return context;
              };
            const value = Reflect.get(browserTarget, browserKey);
            return typeof value === "function"
              ? value.bind(browserTarget)
              : value;
          },
        });
      };
    const value = Reflect.get(target, key);
    return typeof value === "function" ? value.bind(target) : value;
  },
}) as BrowserType;

const renderer = createMermaidRenderer({
  browserType: offlineChromium,
  launchOptions: process.env["PLAYWRIGHT_CHANNEL"]
    ? { channel: process.env["PLAYWRIGHT_CHANNEL"] }
    : {},
});
const cache = new Map<
  string,
  Promise<{ light: DiagramImage; dark: DiagramImage; alt: string }>
>();

interface DiagramImage {
  src: string;
  width: number;
  height: number;
}

function assertLocalCss(css: string) {
  if (/@import/i.test(css))
    throw new Error("Mermaid SVG external CSS resources are forbidden");
  // Quoted and unquoted fragment references are both valid SVG paint servers.
  for (const match of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    if (!match[2]?.trim().startsWith("#"))
      throw new Error("Mermaid SVG external CSS resources are forbidden");
  }
}

/** Image-context SVGs cannot run inline scripts or affect the surrounding DOM. */
export function assertSelfContainedSvg(svg: string) {
  const tree = fromHtml(svg, { fragment: true });
  if (
    !tree.children.some(
      (node) => node.type === "element" && node.tagName === "svg"
    )
  )
    throw new Error("Mermaid did not produce an SVG");
  const visit = (node: RootContent) => {
    if (node.type !== "element") return;
    if (
      [
        "script",
        "foreignObject",
        "image",
        "iframe",
        "object",
        "embed",
        "a",
      ].includes(node.tagName)
    )
      throw new Error(`Unsupported Mermaid SVG element: ${node.tagName}`);
    for (const [name, value] of Object.entries(node.properties)) {
      if (/^on/i.test(name))
        throw new Error("Mermaid SVG event handlers are forbidden");
      if (
        /href|src/i.test(name) &&
        typeof value === "string" &&
        !value.startsWith("#")
      )
        throw new Error("Mermaid SVG external resources are forbidden");
      if (typeof value === "string") assertLocalCss(value);
    }
    if (node.tagName === "style") {
      const css = node.children
        .filter((child) => child.type === "text")
        .map((child) => child.value)
        .join("");
      assertLocalCss(css);
    }
    node.children.forEach(visit);
  };
  tree.children.forEach(visit);
}

/** Shared by the native Markdown and MDX adapters; identical sources render once. */
export function renderMermaid(source: string) {
  let result = cache.get(source);
  if (!result) {
    result = (async () => {
      const prefix = `diagram-${createHash("sha256").update(source).digest("hex").slice(0, 16)}`;
      const renders = await Promise.all(
        (["default", "dark"] as const).map((theme) =>
          renderer([source], {
            prefix,
            mermaidConfig: {
              theme,
              securityLevel: "strict",
              startOnLoad: false,
              htmlLabels: false,
              flowchart: { htmlLabels: false },
              deterministicIds: true,
              deterministicIDSeed: prefix,
              // Authored init/frontmatter cannot relax these rendering boundaries.
              secure: [
                "securityLevel",
                "startOnLoad",
                "htmlLabels",
                "flowchart",
                "theme",
                "themeVariables",
                "fontFamily",
                "maxTextSize",
                "maxEdges",
                "suppressErrorRendering",
              ],
              suppressErrorRendering: true,
            },
          })
        )
      );
      const values = renders.map(([item]) => {
        if (!item || item.status === "rejected")
          throw item?.reason ?? new Error("Empty Mermaid render result");
        assertSelfContainedSvg(item.value.svg);
        return item.value;
      });
      const [light, dark] = values;
      if (!light || !dark) throw new Error("Missing Mermaid theme");
      const image = ({
        svg,
        width,
        height,
      }: {
        svg: string;
        width: number;
        height: number;
      }): DiagramImage => ({
        src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
        width: Math.ceil(width),
        height: Math.ceil(height),
      });
      return {
        light: image(light),
        dark: image(dark),
        alt: light.title ?? "Mermaid diagram",
      };
    })();
    cache.set(source, result);
  }
  return result;
}
