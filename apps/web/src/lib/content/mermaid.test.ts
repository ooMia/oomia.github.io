import { describe, expect, test } from "vite-plus/test";

import { assertSelfContainedSvg } from "./mermaid";

describe("Mermaid SVG image boundary", () => {
  test("accepts local SVG paint and reference fragments", () => {
    expect(() =>
      assertSelfContainedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <style>.arrow { marker-end: url('#arrow'); fill: url("#paint"); }</style>
      <defs><marker id="arrow"/><linearGradient id="paint"/></defs>
      <path style="fill: url(#paint)"/><use href="#arrow"/>
    </svg>`)
    ).not.toThrow();
  });

  test.each([
    '<svg><style>@import "https://example.com/style.css";</style></svg>',
    "<svg><style>text { font-family: url(https://example.com/font); }</style></svg>",
    '<svg><path style="fill: url(https://example.com/image.svg#paint)"/></svg>',
    "<svg><path style=\"fill: url('https://example.com/image.svg#paint')\"/></svg>",
    '<svg><use href="https://example.com/image.svg#paint"/></svg>',
    '<svg><use xlink:href="file:///tmp/image.svg#paint"/></svg>',
    '<svg onload="alert(1)"/>',
    "<svg><script>alert(1)</script></svg>",
    "<svg><foreignObject><div>HTML</div></foreignObject></svg>",
    '<svg><image href="data:image/png;base64,AA=="/></svg>',
    '<svg><a href="#target"><text>link</text></a></svg>',
    "<div>not an SVG</div>",
  ])("rejects active or externally dependent content: %s", (svg) => {
    expect(() => assertSelfContainedSvg(svg)).toThrow();
  });
});
