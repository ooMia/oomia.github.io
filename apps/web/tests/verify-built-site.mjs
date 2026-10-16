import { fromHtml } from "hast-util-from-html";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Check the actual static artifact before upload, without any network requests.
const output = fileURLToPath(new URL("../dist/", import.meta.url));
const origin = new URL(process.env.SITE_URL ?? "http://localhost:4321");
const base =
  `/${(process.env.BASE_PATH ?? "").replace(/^\/+|\/+$/g, "")}`.replace(
    /\/$/,
    ""
  );
const files = readdirSync(output, { recursive: true }).map(String);
const pages = files.filter((file) => file.endsWith(".html"));
assert.ok(pages.includes("index.html"), "Home output must exist");
let checked = 0;
const unresolvedImages = [];

function assertLocal(value, pageUrl, context) {
  if (typeof value !== "string" || !value || value.startsWith("#")) return;
  const url = new URL(value, pageUrl);
  if (
    url.origin !== origin.origin ||
    !["http:", "https:"].includes(url.protocol)
  )
    return;
  assert.ok(
    url.pathname === base || url.pathname.startsWith(`${base}/`),
    `URL outside deployment base: ${context}: ${value}`
  );
  const path = decodeURIComponent(url.pathname.slice(base.length)).replace(
    /^\/+/,
    ""
  );
  let target = resolve(output, path);
  assert.ok(
    target === output.slice(0, -1) || target.startsWith(output),
    `URL outside artifact: ${context}: ${value}`
  );
  if (existsSync(target) && statSync(target).isDirectory())
    target = join(target, "index.html");
  assert.ok(
    existsSync(target) && statSync(target).isFile(),
    `Missing local target: ${context}: ${value}`
  );
  checked++;
}

for (const file of pages) {
  const route = file.replaceAll(sep, "/").replace(/index\.html$/, "");
  const pageUrl = new URL(`${base}/${route}`, origin);
  const tree = fromHtml(readFileSync(join(output, file), "utf8"));
  const visit = (node, authored = false) => {
    if (node.type === "element") {
      const props = node.properties;
      authored ||= Object.hasOwn(props, "dataReadingBody");
      if (node.tagName === "img" && !props.src && !props.srcSet)
        unresolvedImages.push(file);
      for (const name of ["src", "poster"])
        assertLocal(props[name], pageUrl, file);
      if (node.tagName === "astro-island")
        for (const name of [
          "component-url",
          "renderer-url",
          "before-hydration-url",
        ])
          assertLocal(props[name], pageUrl, file);
      if (
        node.tagName === "meta" &&
        (props.property === "og:image" || props.name === "twitter:image")
      )
        assertLocal(props.content, pageUrl, file);
      // Native authored link grammar belongs to Docs; validate generated navigation.
      if (node.tagName === "link" || (node.tagName === "a" && !authored))
        assertLocal(props.href, pageUrl, file);
      if (typeof props.srcSet === "string" && !props.srcSet.includes("data:")) {
        for (const candidate of props.srcSet.split(","))
          assertLocal(
            candidate.trim().replace(/\s+\d+(?:\.\d+)?[wx]$/, ""),
            pageUrl,
            file
          );
      }
    }
    node.children?.forEach((child) => visit(child, authored));
  };
  visit(tree);
}
// Font and image references in generated stylesheets are part of the artifact too.
for (const file of files.filter((file) => file.endsWith(".css"))) {
  const cssUrl = new URL(`${base}/${file.replaceAll(sep, "/")}`, origin);
  const css = readFileSync(join(output, file), "utf8");
  for (const match of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/g))
    assertLocal(match[2], cssUrl, file);
}
const originals = pages.filter((file) =>
  file.replaceAll(sep, "/").startsWith("articles/")
);
assert.ok(originals.length > 0, "Original Articles must exist");
for (const file of originals) {
  const english = join(output, "en", file);
  assert.ok(
    existsSync(english),
    `English Article counterpart missing: ${relative(output, english)}`
  );
}
console.log(
  `Static artifact verified: ${pages.length} HTML pages, ${originals.length} original/English Article pairs, ${checked} local references`
);
// Native media authoring support is a separate consumer concern. Surface these
// placeholders explicitly; existence checks cannot verify an absent URL.
for (const file of unresolvedImages)
  console.warn(`Unresolved native image without a URL: ${file}`);
