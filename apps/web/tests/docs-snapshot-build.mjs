import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const originalWeb = fileURLToPath(new URL("../", import.meta.url));
const originalSite = dirname(dirname(originalWeb));
const root = realpathSync(mkdtempSync(join(tmpdir(), "site-docs-snapshot-")));
const web = join(root, "apps/web");
const docs = join(web, "data/articles");
const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const commit = (cwd, message) => {
  git(cwd, "add", ".");
  git(
    cwd,
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    message
  );
  return git(cwd, "rev-parse", "HEAD");
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
try {
  mkdirSync(web, { recursive: true });
  for (const path of [
    "src",
    "public",
    "astro.config.mts",
    "tsconfig.json",
    "package.json",
  ])
    cpSync(join(originalWeb, path), join(web, path), { recursive: true });
  mkdirSync(join(web, "node_modules"));
  for (const entry of readdirSync(join(originalWeb, "node_modules"))) {
    if (entry !== ".cache")
      symlinkSync(
        join(originalWeb, "node_modules", entry),
        join(web, "node_modules", entry),
        "junction"
      );
  }
  // The unrelated homepage provider reads a local synthetic cache in this offline fixture.
  mkdirSync(join(web, "node_modules/.cache/gravatar"), { recursive: true });
  writeFileSync(
    join(web, "node_modules/.cache/gravatar/oomia6.json"),
    JSON.stringify({
      srcdoc: "<p>Local profile fixture</p>",
      width: 336,
      height: 228,
    })
  );
  symlinkSync(
    join(originalSite, "node_modules"),
    join(root, "node_modules"),
    "junction"
  );
  mkdirSync(join(docs, "content/articles"), { recursive: true });
  mkdirSync(join(docs, "derived"), { recursive: true });
  git(root, "init");
  git(docs, "init");
  writeFileSync(
    join(docs, "content/articles/old.md"),
    "---\ntitle: Old\ndescription: Old\nauthor: ooMia\n---\nOld pinned content.\n"
  );
  const stale = commit(docs, "Old Docs pin");
  git(
    root,
    "update-index",
    "--add",
    "--cacheinfo",
    "160000," + stale + ",apps/web/data/articles"
  );
  const mdx = [
    "---",
    "title: Latest snapshot",
    "description: Fresh canonical content",
    "author: ooMia",
    "---",
    "",
    "# Latest Docs canonical content",
    "",
    "[Successful authored label](https://example.com/success)",
    "",
    "[Unavailable **authored fallback**](https://example.com/unavailable)",
    "",
  ].join("\n");
  const md = [
    "---",
    "title: Native Markdown",
    "description: Native grammar",
    "author: ooMia",
    "---",
    "",
    "[Native authored label](https://example.com/success)",
    "",
  ].join("\n");
  writeFileSync(join(docs, "content/articles/latest.mdx"), mdx);
  writeFileSync(join(docs, "content/articles/native.md"), md);
  const metadata = JSON.stringify([
    {
      url: "https://example.com/success",
      title: "Prepared metadata title",
      presentation: {
        locale: "ko-KR",
        summaryLines: ["첫 번째 의미", "두 번째 의미", "세 번째 의미"],
      },
    },
  ]);
  writeFileSync(join(docs, "derived/external-links.json"), metadata);
  // A provider failure has no successful semantic record and therefore uses the authored link.
  writeFileSync(
    join(docs, "derived/external-links-unavailable.json"),
    JSON.stringify([
      {
        url: "https://example.com/unavailable",
        state: "unavailable",
        failure: "provider-failure",
        stage: "source",
      },
    ])
  );
  commit(docs, "Latest canonical content and partial successful metadata");
  const canonicalTree = git(docs, "rev-parse", "HEAD:content");
  writeFileSync(
    join(docs, "derived/site-consumption.json"),
    JSON.stringify({
      schemaVersion: 1,
      canonicalTree,
      engine: { revision: "a".repeat(40), runId: "1" },
      externalLinks: { candidates: 2, successful: 1, unavailable: 1 },
      artifacts: [
        "derived/external-links-unavailable.json",
        "derived/external-links.json",
      ].map((path) => ({ path, sha256: hash(readFileSync(join(docs, path))) })),
    })
  );
  const latest = commit(docs, "Prepared latest Docs snapshot");
  // Production does not follow this ref after resolving its SHA.
  git(docs, "update-ref", "refs/remotes/origin/main", stale);
  const astroPackageUrl = import.meta.resolve("astro/package.json");
  const astroPackage = JSON.parse(
    readFileSync(new URL(astroPackageUrl), "utf8")
  );
  const cli = fileURLToPath(new URL(astroPackage.bin.astro, astroPackageUrl));
  const preload = fileURLToPath(
    new URL("./link-card/no-network.mjs", import.meta.url)
  );
  const result = spawnSync(process.execPath, [cli, "build", "--root", web], {
    cwd: web,
    env: {
      ...process.env,
      SITE_URL: "https://oomia.github.io",
      BASE_PATH: "/",
      DOCS_CHECKOUT_MODE: "resolved",
      DOCS_CHECKOUT_REVISION: latest,
      ASTRO_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS: (process.env.NODE_OPTIONS ?? "") + " --import=" + preload,
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const rich = readFileSync(
    join(web, "dist/articles/latest/index.html"),
    "utf8"
  );
  assert.ok(rich.includes("Latest Docs canonical content"));
  assert.match(
    rich,
    /<a[^>]*class="[^"]*link-card[^"]*"[^>]*href="https:\/\/example.com\/success"|<a[^>]*href="https:\/\/example.com\/success"[^>]*class="[^"]*link-card/
  );
  assert.ok(rich.includes("Prepared metadata title"));
  for (const line of ["첫 번째 의미", "두 번째 의미", "세 번째 의미"])
    assert.ok(rich.includes(line));
  assert.match(
    rich,
    /<a href="https:\/\/example.com\/unavailable">Unavailable <strong>authored fallback<\/strong><\/a>/
  );
  const native = readFileSync(
    join(web, "dist/articles/native/index.html"),
    "utf8"
  );
  assert.match(
    native,
    /<a href="https:\/\/example.com\/success">Native authored label<\/a>/
  );
  assert.ok(!native.includes('class="link-card'));
  for (const html of [
    rich,
    native,
    readFileSync(join(web, "dist/articles/old/index.html"), "utf8"),
  ])
    assert.ok(
      html.includes('name="oomia:docs-revision" content="' + latest + '"')
    );
  assert.equal(
    readFileSync(join(docs, "content/articles/latest.mdx"), "utf8"),
    mdx
  );
  assert.equal(
    readFileSync(join(docs, "content/articles/native.md"), "utf8"),
    md
  );
  assert.ok(git(root, "ls-files", "--stage").includes(stale));
  assert.notEqual(latest, stale);
  console.log(
    JSON.stringify(
      {
        result: "PASS",
        staleGitlink: stale,
        resolvedDocsRevision: latest,
        latestCanonicalContent: true,
        linkCardWithPreparedMetadata: true,
        candidateUnavailableAuthoredFallback: true,
        nativeMarkdown: true,
        allArticleRevisionMarkers: true,
        canonicalSourcePreserved: true,
        buildNetwork: "blocked",
      },
      null,
      2
    )
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
