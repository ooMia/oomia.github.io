import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

import {
  readArticleTranslations,
  translationForArticle,
} from "./article-translations";

const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
const original =
  "---\ntitle: 원문\ndescription: 설명\nauthor: oomia\n---\n# 제목\n\n본문 [링크](https://example.com) `raw code`.\n\n```js\nconst a = 1;\n```\n";
const translated = original
  .replace("원문", "Original")
  .replace("설명", "Description")
  .replace("제목", "Heading")
  .replace("본문", "Body")
  .replace("링크", "Link");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "site-translations-"));
  const git = (args: string[]) =>
    execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const write = (path: string, text: string) => {
    const target = join(root, path);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, text);
  };
  const commit = (message: string) => {
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
  git(["init", "--initial-branch=main"]);
  const sourcePath = "content/articles/example.md";
  write(sourcePath, original);
  const originalDocsRevision = commit("Original canonical source");
  const translationSha256 = digest(translated);
  const translationPath = `derived/article-translations/en/${translationSha256}.md`;
  write(translationPath, translated);
  const record = {
    sourcePath,
    targetLocale: "en",
    sourceSha256: digest(original),
    translationSha256,
    translationPath,
    originalDocsRevision,
    status: "available",
  };
  const manifest = (records: unknown = [record], version = 1) =>
    write(
      "derived/article-translations.json",
      JSON.stringify({ schemaVersion: version, records })
    );
  manifest();
  const selected = commit("Persist derived translation from ancestor source");
  return {
    root,
    sourcePath,
    record,
    selected,
    originalDocsRevision,
    git,
    write,
    commit,
    manifest,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describe("translation consumer", () => {
  it("accepts an absent manifest and a persisted artifact from an unchanged ancestor", () => {
    const empty = mkdtempSync(join(tmpdir(), "site-translations-empty-"));
    try {
      expect(readArticleTranslations(empty)).toEqual([]);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
    const f = fixture();
    try {
      const records = readArticleTranslations(f.root, f.selected);
      expect(records).toHaveLength(1);
      expect(records[0]?.originalDocsRevision).toBe(f.originalDocsRevision);
      expect(f.originalDocsRevision).not.toBe(f.selected);
      expect(
        translationForArticle(join(f.root, f.sourcePath), records, f.root)
          ?.collectionId
      ).toBe(f.record.translationSha256);
      expect(translationForArticle(undefined, records, f.root)).toBeUndefined();
    } finally {
      f.cleanup();
    }
  });

  it.each([
    [
      "duplicate identity",
      (f: ReturnType<typeof fixture>) => f.manifest([f.record, f.record]),
      "duplicate",
    ],
    [
      "unsupported version",
      (f: ReturnType<typeof fixture>) => f.manifest([f.record], 2),
      "Unsupported",
    ],
    [
      "unsupported status",
      (f: ReturnType<typeof fixture>) =>
        f.manifest([{ ...f.record, status: "ready" }]),
      "identity",
    ],
    [
      "unsupported locale",
      (f: ReturnType<typeof fixture>) =>
        f.manifest([{ ...f.record, targetLocale: "fr" }]),
      "identity",
    ],
    [
      "source traversal",
      (f: ReturnType<typeof fixture>) =>
        f.manifest([
          { ...f.record, sourcePath: "content/articles/../secret.md" },
        ]),
      "identity",
    ],
    [
      "translation traversal",
      (f: ReturnType<typeof fixture>) =>
        f.manifest([{ ...f.record, translationPath: "../outside.md" }]),
      "reference",
    ],
    [
      "grammar conversion",
      (f: ReturnType<typeof fixture>) =>
        f.manifest([
          { ...f.record, translationPath: f.record.translationPath + "x" },
        ]),
      "reference",
    ],
    [
      "wrong selected revision",
      (_f: ReturnType<typeof fixture>) => {},
      "selected",
    ],
    [
      "stale source",
      (f: ReturnType<typeof fixture>) =>
        f.write(f.sourcePath, original + "Updated source"),
      "source bytes",
    ],
    [
      "corrupt translation",
      (f: ReturnType<typeof fixture>) =>
        f.write(f.record.translationPath, "corrupt"),
      "Corrupt",
    ],
    [
      "wrong source revision bytes",
      (f: ReturnType<typeof fixture>) =>
        f.manifest([{ ...f.record, sourceSha256: "f".repeat(64) }]),
      "source bytes",
    ],
  ] as const)("rejects %s", (name, mutate, reason) => {
    const f = fixture();
    try {
      mutate(f);
      expect(() =>
        readArticleTranslations(
          f.root,
          name === "wrong selected revision"
            ? f.originalDocsRevision
            : f.selected
        )
      ).toThrow(reason);
    } finally {
      f.cleanup();
    }
  });

  it("rejects a hash-valid translation that changes code or a URL", () => {
    const f = fixture();
    try {
      const altered = translated.replace("a = 1", "a = 2");
      const alteredHash = digest(altered);
      const alteredPath = `derived/article-translations/en/${alteredHash}.md`;
      f.write(alteredPath, altered);
      f.manifest([
        {
          ...f.record,
          translationPath: alteredPath,
          translationSha256: alteredHash,
        },
      ]);
      expect(() => readArticleTranslations(f.root, f.selected)).toThrow(
        "protected"
      );
    } finally {
      f.cleanup();
    }
  });

  it("rejects a changed selected source tree even if dirty worktree bytes match the old artifact", () => {
    const f = fixture();
    try {
      f.write(f.sourcePath, original + "\nA new canonical revision\n");
      const selected = f.commit("Change the canonical source");
      f.write(f.sourcePath, original);
      expect(() => readArticleTranslations(f.root, selected)).toThrow(
        "source bytes"
      );
    } finally {
      f.cleanup();
    }
  });

  it("rejects sibling history even when the source bytes match", () => {
    const f = fixture();
    try {
      f.git(["checkout", "--orphan", "unrelated"]);
      const unrelated = f.commit("Unrelated history with the same bytes");
      f.manifest([{ ...f.record, originalDocsRevision: unrelated }]);
      f.git(["checkout", "main"]);
      expect(() => readArticleTranslations(f.root, f.selected)).toThrow(
        "ancestor"
      );
    } finally {
      f.cleanup();
    }
  });

  it("rejects a namespace symlink escaping the Docs checkout", () => {
    const f = fixture();
    const outside = mkdtempSync(join(tmpdir(), "site-translation-escape-"));
    try {
      const dir = join(f.root, "derived/article-translations/en");
      rmSync(dir, { recursive: true });
      writeFileSync(
        join(outside, `${f.record.translationSha256}.md`),
        translated
      );
      symlinkSync(outside, dir, "dir");
      expect(() => readArticleTranslations(f.root, f.selected)).toThrow(
        "escapes"
      );
    } finally {
      f.cleanup();
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("does not treat a supplied dangling manifest symlink as absent", () => {
    const f = fixture();
    try {
      const manifest = join(f.root, "derived/article-translations.json");
      rmSync(manifest);
      symlinkSync(join(f.root, "missing-manifest.json"), manifest, "file");
      expect(() => readArticleTranslations(f.root, f.selected)).toThrow(
        "target is missing"
      );
    } finally {
      f.cleanup();
    }
  });

  it.each([
    ["md", "![설명](../photo.png)", "Relative"],
    ["md", "![설명][image]\n\n[image]: ../photo.png", "Relative"],
    ["md", '<img src="../photo.png">', "Relative"],
    ["mdx", '<img src="../photo.png" />', "Relative"],
    ["mdx", "<img src={photo} />", "Dynamic"],
    ["mdx", '<img srcSet="/one.png 1x, /two.png 2x" />', "srcset"],
  ] as const)(
    "fails closed for unsupported %s asset syntax %s",
    (format, suffix, reason) => {
      const f = fixture();
      try {
        const sourcePath = `content/articles/with-image.${format}`;
        const assetSource = original + `\n${suffix}\n`;
        const assetTranslation = translated + `\n${suffix}\n`;
        f.write(sourcePath, assetSource);
        const originalDocsRevision = f.commit("Canonical source with an image");
        const translationSha256 = digest(assetTranslation);
        const translationPath = `derived/article-translations/en/${translationSha256}.${format}`;
        f.write(translationPath, assetTranslation);
        f.manifest([
          {
            ...f.record,
            sourcePath,
            originalDocsRevision,
            sourceSha256: digest(assetSource),
            translationSha256,
            translationPath,
          },
        ]);
        const selected = f.commit(
          "Persist translation with unsupported assets"
        );
        expect(() => readArticleTranslations(f.root, selected)).toThrow(reason);
      } finally {
        f.cleanup();
      }
    }
  );
});
