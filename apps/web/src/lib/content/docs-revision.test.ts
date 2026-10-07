import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

import { resolvedDocsRevision } from "./docs-revision";

describe("Docs checkout provenance", () => {
  it("accepts immutable production snapshots despite a stale gitlink or moving main", () => {
    const root = mkdtempSync(join(tmpdir(), "site-docs-provenance-"));
    const web = join(root, "apps/web");
    const docs = join(web, "data/articles");
    const git = (cwd: string, ...args: string[]) =>
      execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
    try {
      mkdirSync(docs, { recursive: true });
      git(root, "init");
      git(docs, "init");
      writeFileSync(join(docs, "article.md"), "First\n");
      git(docs, "add", ".");
      git(
        docs,
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.com",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        "Pinned"
      );
      const pin = git(docs, "rev-parse", "HEAD");
      git(
        root,
        "update-index",
        "--add",
        "--cacheinfo",
        `160000,${pin},apps/web/data/articles`
      );
      expect(resolvedDocsRevision(web, "pinned")).toBe(pin);
      writeFileSync(join(docs, "article.md"), "Latest\n");
      git(docs, "add", ".");
      git(
        docs,
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.com",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        "Latest"
      );
      const latest = git(docs, "rev-parse", "HEAD");
      git(docs, "update-ref", "refs/remotes/origin/main", latest);
      expect(resolvedDocsRevision(web, "main")).toBe(latest);
      expect(resolvedDocsRevision(web, "resolved", latest)).toBe(latest);
      // A later movement of main cannot invalidate or replace a resolved release.
      git(docs, "update-ref", "refs/remotes/origin/main", pin);
      expect(resolvedDocsRevision(web, "resolved", latest)).toBe(latest);
      expect(() => resolvedDocsRevision(web, "resolved", pin)).toThrow(
        /resolved production SHA/
      );
      expect(() => resolvedDocsRevision(web, "resolved", "main")).toThrow(
        /resolved production SHA/
      );
      expect(() => resolvedDocsRevision(web, "pinned")).toThrow(
        /pinned Site gitlink/
      );
      expect(git(root, "ls-files", "--stage")).toContain(pin);
      git(docs, "update-ref", "refs/remotes/origin/main", latest);
      git(docs, "checkout", "--detach", pin);
      expect(() => resolvedDocsRevision(web, "main")).toThrow(
        /fetched Docs main/
      );
      expect(() => resolvedDocsRevision(web, "other")).toThrow(/Unsupported/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
