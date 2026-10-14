import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = mkdtempSync(join(webRoot, "tests/translations/.native-"));
const docsRoot = join(fixture, "data/articles");
const evidenceRoot = join(webRoot, "test-results/translations");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const write = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
};
const git = (args) =>
  execFileSync("git", ["-C", docsRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const commit = (message) => {
  git(["add", "."]);
  git([
    "-c",
    "user.name=Site Fixture",
    "-c",
    "user.email=site-fixture@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    message,
  ]);
  return git(["rev-parse", "HEAD"]);
};
const body = `# 읽는 방법

한글 문단과 **강조**가 있습니다. [링크](https://example.com/article?q=one&next=two)를 읽습니다.

## 코드와 표

\`raw  code\`는 변경하지 않습니다.

~~~js title="example.js"
const message = "한글  keep";
const escaped = "<tag>&";
~~~

| 분류 | 값 |
| --- | --- |
| 문자 | value |

> 인용문입니다.

![설명](/translation-check/images/fixture.svg)
`;
const english = body
  .replace("읽는 방법", "How to read")
  .replace(
    "한글 문단과 **강조**가 있습니다.",
    "This paragraph contains **emphasis**."
  )
  .replace("링크", "Link")
  .replace("를 읽습니다.", "is worth reading.")
  .replace("코드와 표", "Code and tables")
  .replace("는 변경하지 않습니다.", "remains unchanged.")
  .replace("분류", "Category")
  .replace("값", "Value")
  .replace("문자", "Text")
  .replace("인용문입니다.", "This is a quotation.")
  .replace("설명", "Description");
const source = (format) =>
  `---\ntitle: 원문 ${format}\ndescription: 원문 설명\nauthor: oomia\ntags: [Native]\ndraft: false\n---\n${body}${format === "mdx" ? '\n<Callout type="info">한글 안내입니다.</Callout>\n' : ""}`;
const translated = (format) =>
  `---\ntitle: English ${format}\ndescription: Translated description\nauthor: deliberately-untrusted\ntags: [Translated]\ndraft: true\nsourcePath: content/articles/wrong.md\noriginalDocsRevision: ${"f".repeat(40)}\nsourceSha256: ${"e".repeat(64)}\ntranslationSha256: ${"d".repeat(64)}\n---\n${english}${format === "mdx" ? '\n<Callout type="info">This is a translated note.</Callout>\n' : ""}`;
const unescape = (text) =>
  text
    .replace(/<[^>]*>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");

try {
  mkdirSync(docsRoot, { recursive: true });
  git(["init", "--initial-branch=main"]);
  for (const format of ["md", "mdx"])
    write(
      join(docsRoot, `content/articles/example-${format}.${format}`),
      source(format)
    );
  const originalDocsRevision = commit("Canonical originals");
  const records = ["md", "mdx"].map((format) => {
    const bytes = translated(format);
    const translationSha256 = hash(bytes);
    const translationPath = `derived/article-translations/en/${translationSha256}.${format}`;
    write(join(docsRoot, translationPath), bytes);
    return {
      sourcePath: `content/articles/example-${format}.${format}`,
      targetLocale: "en",
      sourceSha256: hash(source(format)),
      translationSha256,
      translationPath,
      originalDocsRevision,
      status: "available",
    };
  });
  write(
    join(docsRoot, "derived/article-translations.json"),
    JSON.stringify({ schemaVersion: 1, records }, null, 2)
  );
  const selectedDocsRevision = commit(
    "Persist translations based on unchanged ancestor"
  );
  write(
    join(fixture, "package.json"),
    JSON.stringify({
      name: "native-translation-fixture",
      private: true,
      type: "module",
    })
  );
  write(
    join(fixture, "public/images/fixture.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>'
  );
  write(
    join(fixture, "astro.config.mjs"),
    `import {defineConfig} from 'astro/config';\nimport {mdx} from '@workspace/md';\nimport {articleProcessors} from ${JSON.stringify(join(webRoot, "src/lib/content/article-processors.ts"))};\nconst processors=articleProcessors(()=>undefined);\nexport default defineConfig({site:'https://example.test',base:'/translation-check/',output:'static',cacheDir:'./.astro-cache/',outDir:'./dist/',markdown:{processor:processors.markdown},integrations:[mdx({processor:processors.mdx})],vite:{cacheDir:new URL('./.vite-cache/',import.meta.url).pathname,resolve:{alias:{'@':${JSON.stringify(join(webRoot, "src"))}}}}});\n`
  );
  write(
    join(fixture, "src/content.config.ts"),
    `export {collections} from ${JSON.stringify(join(webRoot, "src/content.config.ts"))};\n`
  );
  write(
    join(fixture, "src/pages/en/[...id].astro"),
    `---
import {getCollection,render} from 'astro:content';
import Callout from '@/components/Callout.astro';
import LinkCard from '@/components/LinkCard.astro';
export async function getStaticPaths(){const originals=await getCollection('articles');const entries=await getCollection('articleTranslations');return originals.map(original=>{const translation=entries.find(entry=>original.filePath?.replaceAll('\\\\','/').endsWith('/'+entry.data.sourcePath));if(!translation)throw new Error('Fixture translation missing');return{params:{id:original.id},props:{original,translation}}});}
const {original,translation}=Astro.props;const {Content,headings}=await render(translation);
---
<html lang="en"><head><title>{translation.data.title}</title><meta name="source-revision" content={translation.data.originalDocsRevision}/></head><body><header><h1>{translation.data.title}</h1><p data-author>{original.data.author}</p><p data-tags>{original.data.tags?.join(',')}</p></header><main><Content components={{Callout,LinkCard}} /></main><script is:inline id="native-headings" type="application/json" set:html={JSON.stringify(headings).replace(/</g,'\\u003c')} /></body></html>
`
  );
  const astroPackage = JSON.parse(
    readFileSync(join(webRoot, "node_modules/astro/package.json"), "utf8")
  );
  const build = () => {
    const result = spawnSync(
      process.execPath,
      [join(webRoot, "node_modules/astro", astroPackage.bin.astro), "build"],
      {
        cwd: fixture,
        encoding: "utf8",
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
        maxBuffer: 8 * 1024 * 1024,
      }
    );
    if (result.status !== 0)
      throw new Error(
        `Native translated fixture build failed:\n${result.stdout}\n${result.stderr}`
      );
  };
  build();
  const cachePath = realpathSync(join(fixture, ".astro-cache"));
  assert.equal(dirname(cachePath), realpathSync(fixture));
  const observations = [];
  for (const format of ["md", "mdx"]) {
    const page = join(fixture, `dist/en/example-${format}/index.html`);
    const html = readFileSync(page, "utf8");
    const headings = JSON.parse(
      html.match(
        /<script[^>]*id="native-headings"[^>]*>(.*?)<\/script>/s
      )?.[1] ?? "null"
    );
    assert.deepEqual(
      headings.map((heading) => heading.text),
      ["How to read", "Code and tables"]
    );
    assert.match(html, new RegExp(`English ${format}`));
    assert.match(html, /data-author[^>]*>oomia<\/p>/);
    assert.match(html, /data-tags[^>]*>Native<\/p>/);
    assert.doesNotMatch(html, /deliberately-untrusted|>Translated<|lang="ko"/);
    assert.match(
      html,
      new RegExp(`name="source-revision" content="${originalDocsRevision}"`)
    );
    assert.match(html, /<table[\s>]/);
    assert.match(html, /<blockquote[\s>]/);
    assert.match(
      html,
      /href="https:\/\/example.com\/article\?q=one(?:&amp;|&)next=two"/
    );
    assert.match(html, /src="\/translation-check\/images\/fixture.svg"/);
    const code = unescape(
      html.match(
        /<pre[^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/
      )?.[1] ?? ""
    );
    assert.equal(
      code,
      'const message = "한글  keep";\nconst escaped = "<tag>&";'
    );
    if (format === "mdx") assert.match(html, /This is a translated note/);
    observations.push({
      format,
      headings: headings.length,
      nativeCode: true,
      table: true,
      quote: true,
      image: true,
      originalMetadata: true,
      component: format === "mdx",
    });
  }
  // Reuse the native content cache with unchanged translated bytes, changing
  // only the validated source revision to another unchanged ancestor.
  for (const record of records)
    record.originalDocsRevision = selectedDocsRevision;
  write(
    join(docsRoot, "derived/article-translations.json"),
    JSON.stringify({ schemaVersion: 1, records }, null, 2)
  );
  const secondSelectedDocsRevision = commit(
    "Update source provenance without changing translated files"
  );
  build();
  for (const format of ["md", "mdx"]) {
    const html = readFileSync(
      join(fixture, `dist/en/example-${format}/index.html`),
      "utf8"
    );
    assert.match(
      html,
      new RegExp(`name="source-revision" content="${selectedDocsRevision}"`)
    );
    assert.doesNotMatch(
      html,
      /content\/articles\/wrong.md|deliberately-untrusted/
    );
  }
  mkdirSync(evidenceRoot, { recursive: true });
  cpSync(join(fixture, "dist"), join(evidenceRoot, "dist"), {
    recursive: true,
  });
  write(
    join(evidenceRoot, "native-build.json"),
    JSON.stringify(
      {
        originalDocsRevision,
        selectedDocsRevision,
        secondSelectedDocsRevision,
        cachedProvenanceUpdate: true,
        isolatedAstroCache: true,
        isolatedViteCacheConfigured: true,
        untrustedFrontmatterOverwritten: true,
        sourceAncestor: originalDocsRevision !== selectedDocsRevision,
        source:
          "Isolated fixture; production content.config and processors; native Astro render; no provider calls",
        observations,
      },
      null,
      2
    )
  );
  process.stdout.write(
    `Native translated .md/.mdx fixture: PASS (${observations.length} routes)\n`
  );
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
