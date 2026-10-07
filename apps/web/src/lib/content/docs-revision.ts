import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/** Derive provenance from Git at the selected checkout, never caller-supplied SHA metadata. */
export function resolvedDocsRevision(
  webRoot = process.cwd(),
  mode = process.env["DOCS_CHECKOUT_MODE"] ?? "pinned",
  expected = process.env["DOCS_CHECKOUT_REVISION"]
) {
  const docsRoot = resolve(webRoot, "data/articles");
  const git = (root: string, args: string[]) =>
    execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
  const actual = git(docsRoot, ["rev-parse", "HEAD"]);
  if (mode === "resolved") {
    // A production release resolves main once. Never read a moving ref here.
    if (!expected || !/^[a-f0-9]{40}$/.test(expected) || actual !== expected)
      throw new Error("Docs checkout must match the resolved production SHA");
  } else if (mode === "main") {
    // Validate the snapshot fetched by checkout, without another moving remote read.
    const fetchedMain = git(docsRoot, [
      "rev-parse",
      "refs/remotes/origin/main",
    ]);
    if (actual !== fetchedMain)
      throw new Error("Docs checkout must match the fetched Docs main HEAD");
  } else if (mode === "pinned") {
    const staged = git(resolve(webRoot, "../.."), [
      "ls-files",
      "--stage",
      "apps/web/data/articles",
    ]);
    const match = /^160000 ([a-f0-9]{40}) 0\tapps\/web\/data\/articles$/.exec(
      staged
    );
    if (!match || actual !== match[1])
      throw new Error("Docs checkout must match the pinned Site gitlink");
  } else {
    throw new Error("Unsupported Docs checkout mode");
  }
  return actual;
}
