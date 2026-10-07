import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/** Derive provenance from the actual gitlink consumed by this build, never caller metadata. */
export function pinnedDocsRevision(webRoot = process.cwd()) {
  const siteRoot = resolve(webRoot, "../..");
  const staged = execFileSync(
    "git",
    ["-C", siteRoot, "ls-files", "--stage", "apps/web/data/articles"],
    { encoding: "utf8" }
  ).trim();
  const match = /^160000 ([a-f0-9]{40}) 0\tapps\/web\/data\/articles$/.exec(
    staged
  );
  const actual = execFileSync(
    "git",
    ["-C", resolve(webRoot, "data/articles"), "rev-parse", "HEAD"],
    { encoding: "utf8" }
  ).trim();
  if (!match || actual !== match[1])
    throw new Error("Docs checkout must match the pinned Site gitlink");
  return actual;
}
