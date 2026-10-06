import { createElement } from "react";

import type { LinkCardData } from "../../src/lib/content/link-card";

/** Static component proof, not the final rich-card responsive design. */
export default function LinkCard(props: LinkCardData) {
  return createElement(
    "a",
    { href: props.url, className: "link-card", "data-link-card": "component" },
    props.image
      ? createElement("img", { src: props.image, alt: "", loading: "lazy" })
      : null,
    createElement(
      "span",
      { className: "link-card__body" },
      props.siteName
        ? createElement(
            "span",
            { className: "link-card__site" },
            props.siteName
          )
        : null,
      createElement("span", { className: "link-card__title" }, props.title),
      props.description
        ? createElement(
            "span",
            { className: "link-card__description" },
            props.description
          )
        : null
    )
  );
}
