import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vite-plus/test";

import { selectDocsCheckout } from "./prepare-content.mjs";

it("prepares the published immutable SHA, preserves the pin, and rejects dirty input before network", async () => {
  const site = mkdtempSync(join(tmpdir(), "site-development-content-"));
  const root = join(site, "apps/web");
  const docs = join(root, "data/articles");
  const git = (cwd: string, ...args: string[]) =>
    execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  const commit = () => {
    git(docs, "add", ".");
    git(
      docs,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.test",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-m",
      "Content"
    );
    return git(docs, "rev-parse", "HEAD");
  };
  try {
    mkdirSync(docs, { recursive: true });
    git(site, "init");
    git(docs, "init");
    writeFileSync(join(docs, "article.md"), "Pinned\n");
    const pin = commit();
    git(
      site,
      "update-index",
      "--add",
      "--cacheinfo",
      `160000,${pin},apps/web/data/articles`
    );
    writeFileSync(join(docs, "article.md"), "Published\n");
    const published = commit();
    git(docs, "update-ref", "refs/remotes/origin/main", pin);
    git(docs, "checkout", "--detach", pin);
    let requests = 0;
    const marker = {
      schemaVersion: 1,
      siteRevision: "a".repeat(40),
      docsRevision: published,
    };
    const fetcher = async () => {
      requests++;
      return new Response(JSON.stringify(marker));
    };
    const selected = await selectDocsCheckout({ root, fetcher });
    expect(requests).toBe(1);
    expect(selected.docsRevision).toBe(published);
    expect(git(docs, "rev-parse", "HEAD")).toBe(published);
    expect(git(site, "ls-files", "--stage")).toContain(pin);
    expect(git(docs, "rev-parse", "origin/main")).toBe(pin);

    writeFileSync(join(docs, "article.md"), "Uncommitted author work\n");
    await expect(selectDocsCheckout({ root, fetcher })).rejects.toThrow(
      /dirty/
    );
    expect(requests).toBe(1);
    expect(readFileSync(join(docs, "article.md"), "utf8")).toBe(
      "Uncommitted author work\n"
    );
    git(docs, "restore", "article.md");
    expect(
      (await selectDocsCheckout({ root, source: "current", fetcher }))
        .docsRevision
    ).toBe(published);
    expect(requests).toBe(1);
    expect(
      (await selectDocsCheckout({ root, source: "pinned", fetcher }))
        .docsRevision
    ).toBe(pin);
    expect(requests).toBe(1);
    await expect(
      selectDocsCheckout({ root, source: "cached", fetcher })
    ).rejects.toThrow(/No validated cached/);
    await expect(
      selectDocsCheckout({
        root,
        fetcher: async () =>
          new Response(JSON.stringify({ ...marker, docsRevision: "main" })),
      })
    ).rejects.toThrow(/Invalid public publication marker/);
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
});
