import { linkCard } from "@workspace/md";

import type { LinkCardResolver } from "./link-card";

function textElement(className: string, value: string) {
  return {
    type: "element" as const,
    tagName: "span",
    properties: { className: [className] },
    children: [{ type: "text" as const, value }],
  };
}

export default function staticLinkCard(resolve: LinkCardResolver) {
  return linkCard((href, node) => {
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

    return {
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
    };
  });
}
