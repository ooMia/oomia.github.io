import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const html = readFileSync(
  new URL(
    "../dist/articles/tech/log/publishing-platform-1/index.html",
    import.meta.url
  ),
  "utf8"
);
const base = (process.env.BASE_PATH ?? "").replace(/^\/+|\/+$/g, "");
const expected = new URL(
  `${base ? `/${base}` : ""}/articles/tech/log/publishing-platform-1/`,
  process.env.SITE_URL ?? "http://localhost:4321"
).href;
const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
const og = /<meta property="og:url" content="([^"]+)"/.exec(html)?.[1];
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
assert.equal(
  canonical,
  expected,
  "Public canonical URL must survive root build environment filtering"
);
assert.equal(og, expected);
assert.ok(html.includes(`name="oomia:docs-revision" content="${revision}"`));
for (const image of html.matchAll(
  /(?:property="og:image"|name="twitter:image") content="([^"]+)"/g
)) {
  assert.equal(new URL(image[1]).origin, new URL(expected).origin);
  assert.ok(
    new URL(image[1]).pathname.startsWith(
      `${base ? `/${base}` : ""}/social-previews/`
    )
  );
}
console.log(`Built social metadata verified: ${expected}; Docs ${revision}`);
