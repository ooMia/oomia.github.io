import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = (process.env.BASE_PATH ?? "").replace(/^\/+|\/+$/g, "");
const revision = execFileSync(
  "git",
  [
    "-C",
    fileURLToPath(new URL("../data/articles/", import.meta.url)),
    "rev-parse",
    "HEAD",
  ],
  { encoding: "utf8" }
).trim();
if (process.env.DOCS_CHECKOUT_MODE === "resolved")
  assert.equal(
    revision,
    process.env.DOCS_CHECKOUT_REVISION,
    "Checkout must retain the resolved production SHA"
  );
const articleOutput = fileURLToPath(
  new URL("../dist/articles/", import.meta.url)
);
const pages = readdirSync(articleOutput, { recursive: true })
  .map(String)
  .map((path) => path.replaceAll("\\", "/"))
  .filter((path) => path.endsWith("/index.html") || path === "index.html");
assert.ok(pages.length > 0, "Built Article pages must be present");
for (const path of pages) {
  const rendered = readFileSync(
    new URL(path, new URL("../dist/articles/", import.meta.url)),
    "utf8"
  );
  const expected = new URL(
    `${base ? `/${base}` : ""}/articles/${path.slice(0, -"index.html".length)}`,
    process.env.SITE_URL ?? "http://localhost:4321"
  ).href;
  assert.equal(
    /<link rel="canonical" href="([^"]+)"/.exec(rendered)?.[1],
    expected,
    "Public canonical URL must survive root build environment filtering: " +
      path
  );
  assert.equal(
    /<meta property="og:url" content="([^"]+)"/.exec(rendered)?.[1],
    expected
  );
  const markers = [
    ...rendered.matchAll(/name="oomia:docs-revision" content="([^"]+)"/g),
  ];
  assert.equal(
    markers.length,
    1,
    "Every Article must expose one content revision: " + path
  );
  assert.equal(
    markers[0][1],
    revision,
    "Built content revision mismatch: " + path
  );
  for (const image of rendered.matchAll(
    /(?:property="og:image"|name="twitter:image") content="([^"]+)"/g
  )) {
    assert.equal(new URL(image[1]).origin, new URL(expected).origin);
    assert.ok(
      new URL(image[1]).pathname.startsWith(
        `${base ? `/${base}` : ""}/social-previews/`
      )
    );
  }
}
console.log(
  `Built social metadata verified: ${pages.length} Articles at Docs ${revision}`
);
