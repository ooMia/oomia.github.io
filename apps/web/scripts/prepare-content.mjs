import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const publicationUrl =
  "https://oomia.github.io/.well-known/oomia-publication.json";
const docsRepository = "https://github.com/ooMia/oomia.github.io.docs.git";
const fullSha = /^[a-f0-9]{40}$/;
export const webRoot = fileURLToPath(new URL("../", import.meta.url));
const git = (cwd, ...args) =>
  execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

function publication(value) {
  if (
    value?.schemaVersion !== 1 ||
    !fullSha.test(value.siteRevision ?? "") ||
    !fullSha.test(value.docsRevision ?? "")
  )
    throw new Error(
      "Invalid public publication marker: expected full Site and Docs SHAs"
    );
  return {
    schemaVersion: 1,
    siteRevision: value.siteRevision,
    docsRevision: value.docsRevision,
  };
}

/** Select once, then operate only on that immutable Docs SHA. No content is produced. */
export async function selectDocsCheckout({
  root = webRoot,
  source = "published",
  fetcher = fetch,
} = {}) {
  if (!["published", "pinned", "current", "cached"].includes(source))
    throw new Error(
      "Content source must be published, pinned, current or cached"
    );
  const docs = resolve(root, "data/articles");
  const cache = resolve(root, ".cache/dev-content.json");
  let initialized = false;
  try {
    initialized =
      realpathSync(git(docs, "rev-parse", "--show-toplevel")) ===
      realpathSync(docs);
  } catch {
    /* An uninitialized submodule is an empty directory. */
  }
  if (
    initialized &&
    git(docs, "status", "--porcelain", "--untracked-files=all")
  )
    throw new Error(
      "Docs checkout is dirty. Commit or preserve its changes before preparing development content."
    );
  if (!initialized && existsSync(docs) && readdirSync(docs).length)
    throw new Error(
      "Content mount is not an independent Docs checkout and is not empty"
    );

  let marker;
  let revision;
  if (source === "published") {
    let response;
    try {
      response = await fetcher(publicationUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
    } catch (cause) {
      throw new Error(
        "Cannot resolve published Docs snapshot. Use --source=cached explicitly for a previously validated snapshot.",
        { cause }
      );
    }
    if (!response.ok)
      throw new Error(
        `Cannot resolve published Docs snapshot: HTTP ${response.status}. Use --source=cached explicitly for a previously validated snapshot.`
      );
    marker = publication(await response.json());
    revision = marker.docsRevision;
  } else if (source === "cached") {
    if (!existsSync(cache))
      throw new Error(
        "No validated cached publication selection. Run published preparation online first."
      );
    marker = publication(JSON.parse(readFileSync(cache, "utf8")));
    revision = marker.docsRevision;
  } else if (source === "current") {
    if (!initialized)
      throw new Error(
        "Current content source requires an existing Docs checkout"
      );
    revision = git(docs, "rev-parse", "HEAD");
  } else {
    const staged = git(
      resolve(root, "../.."),
      "ls-files",
      "--stage",
      "apps/web/data/articles"
    );
    revision = /^160000 ([a-f0-9]{40}) 0\tapps\/web\/data\/articles$/.exec(
      staged
    )?.[1];
    if (!revision) throw new Error("No stored Site Docs gitlink is available");
  }
  if (!fullSha.test(revision ?? ""))
    throw new Error("Selected Docs revision is not a full lowercase Git SHA");
  if (!initialized) {
    if (source === "cached")
      throw new Error(
        "Cached snapshot requires an existing local Docs checkout; no network is used"
      );
    mkdirSync(dirname(docs), { recursive: true });
    execFileSync("git", ["clone", "--no-checkout", docsRepository, docs], {
      stdio: "inherit",
    });
  }
  let present = false;
  try {
    git(docs, "cat-file", "-e", `${revision}^{commit}`);
    present = true;
  } catch {
    /* Fetch only the already selected SHA below. */
  }
  if (!present) {
    if (source === "cached" || source === "current")
      throw new Error(
        "Selected snapshot is not available locally; this source never fetches"
      );
    git(docs, "fetch", "origin", revision);
  }
  if (
    source !== "current" &&
    (!initialized || git(docs, "rev-parse", "HEAD") !== revision)
  )
    git(docs, "checkout", "--detach", revision);
  const actual = git(docs, "rev-parse", "HEAD");
  if (actual !== revision)
    throw new Error("Actual Docs checkout does not match selected snapshot");
  return {
    source,
    docsRevision: actual,
    ...(marker ? { siteRevision: marker.siteRevision } : {}),
    marker,
    cache,
  };
}

export function runAstro(args, selection, root = webRoot) {
  const packageUrl = import.meta.resolve("astro/package.json");
  const pkg = JSON.parse(readFileSync(new URL(packageUrl), "utf8"));
  const cli = fileURLToPath(new URL(pkg.bin.astro, packageUrl));
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      DOCS_CHECKOUT_MODE: "resolved",
      DOCS_CHECKOUT_REVISION: selection.docsRevision,
    },
  });
}

export async function prepareContent(options = {}) {
  const selection = await selectDocsCheckout(options);
  const checked = runAstro(["sync"], selection, options.root);
  if (checked.error) throw checked.error;
  if (checked.status !== 0)
    throw new Error(
      "Selected Docs snapshot failed readiness/content validation; the selected revision is retained, with no fallback or cache update"
    );
  if (selection.source === "published") {
    mkdirSync(dirname(selection.cache), { recursive: true });
    writeFileSync(selection.cache, `${JSON.stringify(selection.marker)}\n`);
  }
  console.log(
    `Development content (${selection.source}): Docs ${selection.docsRevision}${selection.siteRevision ? `; published Site ${selection.siteRevision}` : ""}. Readiness and native content sync passed.`
  );
  return selection;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && !args[0].startsWith("--source=")))
    throw new Error(
      "Usage: prepare-content.mjs [--source=published|pinned|current|cached]"
    );
  await prepareContent({
    source: args[0]?.slice("--source=".length) ?? "published",
  });
}
