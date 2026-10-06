import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { markdownToHtml, markdownToJs } from "satteri";
import { expect, test } from "vite-plus/test";

import { compileAndRender } from "./compile";

// Observation only: no flaky timing threshold. Does not benchmark Astro or production.
test("records warmed standalone compiler/render cost and generated module size", async () => {
  const source = readFileSync(
    new URL(
      "../../data/articles/content/articles/tech/log/TDD-dev-flow.md",
      import.meta.url
    ),
    "utf8"
  );
  const rounds = 100;
  const options = { features: { rawHtml: true } };
  for (let i = 0; i < 10; i++) {
    markdownToHtml(source, options);
    await compileAndRender(source, "markdown", options, {});
  }
  const start = performance.now();
  for (let i = 0; i < rounds; i++) markdownToHtml(source, options);
  const htmlMs = performance.now() - start;
  const jsStart = performance.now();
  for (let i = 0; i < rounds; i++)
    await compileAndRender(source, "markdown", options, {});
  const jsMs = performance.now() - jsStart;
  const module = markdownToJs(source, options);
  expect(module.code).toContain("MDXContent");
  console.info(
    JSON.stringify({
      rounds,
      sourceBytes: Buffer.byteLength(source),
      htmlMeanMs: htmlMs / rounds,
      jsCompileAndReactSSRMeanMs: jsMs / rounds,
      moduleBytes: Buffer.byteLength(module.code),
      gzipModuleBytes: gzipSync(module.code).byteLength,
    })
  );
});
