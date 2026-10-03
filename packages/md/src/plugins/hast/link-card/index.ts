import type { HastPluginEntry } from "../../types";

export interface LinkCardData {
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly image?: string;
  readonly siteName?: string;
}

export type LinkCardResolver = (url: string) => LinkCardData | undefined;

function isExternalHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function textElement(className: string, value: string) {
  return {
    type: "element" as const,
    tagName: "span",
    properties: { className: [className] },
    children: [{ type: "text" as const, value }],
  };
}

export default function linkCard(resolve: LinkCardResolver): HastPluginEntry {
  return {
    name: "link-card",
    element: {
      filter: ["a"],
      visit(node, ctx) {
        const parent = ctx.parent(node);
        const href = node.properties.href;

        if (
          typeof href !== "string" ||
          !isExternalHttpUrl(href) ||
          parent?.type !== "element" ||
          parent.tagName !== "p" ||
          parent.children.length !== 1
        ) {
          return;
        }

        const metadata = resolve(href);

        if (!metadata) {
          return;
        }

        const body = [
          ...(metadata.siteName
            ? [textElement("link-card__site", metadata.siteName)]
            : []),
          textElement("link-card__title", metadata.title),
          ...(metadata.description
            ? [textElement("link-card__description", metadata.description)]
            : []),
        ];

        ctx.replaceNode(node, {
          type: "element",
          tagName: "a",
          properties: {
            ...node.properties,
            href: metadata.url,
            className: ["link-card"],
            dataLinkCard: "true",
          },
          children: [
            ...(metadata.image
              ? [
                  {
                    type: "element" as const,
                    tagName: "img",
                    properties: {
                      className: ["link-card__image"],
                      src: metadata.image,
                      alt: "",
                      loading: "lazy",
                    },
                    children: [],
                  },
                ]
              : []),
            {
              type: "element",
              tagName: "span",
              properties: { className: ["link-card__body"] },
              children: body,
            },
          ],
        });
      },
    },
  };
}
