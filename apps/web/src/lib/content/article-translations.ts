import { assertTranslationIntegrity } from "@workspace/md";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

import { markdownFeatures } from "./article-processors";

export interface ArticleTranslation {
  readonly sourcePath: string;
  readonly targetLocale: "en";
  readonly sourceSha256: string;
  readonly translationSha256: string;
  readonly translationPath: string;
  readonly originalDocsRevision: string;
  readonly status: "available";
  readonly collectionId: string;
}

const hash = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const sha256 = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

function contained(root: string, path: string) {
  const actual = realpathSync(path);
  const inside = relative(realpathSync(root), actual);
  if (isAbsolute(inside) || inside === ".." || inside.startsWith(`..${sep}`))
    throw new Error("Translation input escapes its namespace");
  return actual;
}

/** Optional Docs-owned inputs: absent is valid, supplied invalid/stale bytes fail closed. */
export function readArticleTranslations(
  docsRoot = resolve("data/articles"),
  selectedDocsRevision?: string
): ArticleTranslation[] {
  const manifest = resolve(docsRoot, "derived/article-translations.json");
  if (!existsSync(manifest)) {
    try {
      lstatSync(manifest);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    throw new Error("Supplied translation manifest target is missing");
  }
  contained(docsRoot, manifest);
  const value = JSON.parse(readFileSync(manifest, "utf8"));
  if (value?.schemaVersion !== 1 || !Array.isArray(value.records))
    throw new Error("Unsupported article translation manifest");
  if (value.records.length === 0) return [];
  const git = (args: string[]) =>
    execFileSync("git", ["-C", docsRoot, ...args], {
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  const actualRevision = git(["rev-parse", "HEAD"]).toString("utf8").trim();
  const selected = selectedDocsRevision ?? actualRevision;
  if (!/^[a-f0-9]{40}$/.test(selected) || selected !== actualRevision)
    throw new Error("Translation inputs must use the selected Docs checkout");
  const identities = new Set<string>();
  const paths = new Set<string>();

  return value.records.map((record: Record<string, unknown>) => {
    if (!record || typeof record !== "object")
      throw new Error("Invalid article translation record");
    const sourcePath = record["sourcePath"];
    const sourceSha256 = record["sourceSha256"];
    const translationSha256 = record["translationSha256"];
    const originalDocsRevision = record["originalDocsRevision"];
    const translationPath = record["translationPath"];
    if (
      typeof sourcePath !== "string" ||
      !sourcePath.startsWith("content/articles/") ||
      !/\.(md|mdx)$/.test(sourcePath) ||
      sourcePath.includes("\\") ||
      sourcePath
        .split("/")
        .some((part) => !part || part === "." || part === "..") ||
      record["targetLocale"] !== "en" ||
      record["status"] !== "available" ||
      !sha256(sourceSha256) ||
      !sha256(translationSha256) ||
      typeof originalDocsRevision !== "string" ||
      !/^[a-f0-9]{40}$/.test(originalDocsRevision) ||
      identities.has(sourcePath)
    )
      throw new Error(
        "Invalid or duplicate article translation identity/provenance"
      );
    identities.add(sourcePath);
    if (
      translationPath !==
        `derived/article-translations/en/${translationSha256}${extname(sourcePath)}` ||
      paths.has(String(translationPath))
    )
      throw new Error(
        "Invalid or duplicate article translation file reference"
      );
    paths.add(String(translationPath));

    try {
      git(["merge-base", "--is-ancestor", originalDocsRevision, selected]);
    } catch {
      throw new Error(
        "Original translation revision is not an ancestor of the selected Docs revision"
      );
    }
    const originalBytes = git([
      "show",
      `${originalDocsRevision}:${sourcePath}`,
    ]);
    const selectedBytes = git(["show", `${selected}:${sourcePath}`]);
    const sourceFile = contained(docsRoot, resolve(docsRoot, sourcePath));
    contained(resolve(docsRoot, "content/articles"), sourceFile);
    const currentBytes = readFileSync(sourceFile);
    if (
      hash(originalBytes) !== sourceSha256 ||
      hash(selectedBytes) !== sourceSha256 ||
      hash(currentBytes) !== sourceSha256
    )
      throw new Error("Stale or mismatched translation source bytes");
    const translationFile = contained(
      docsRoot,
      resolve(docsRoot, String(translationPath))
    );
    contained(
      resolve(docsRoot, "derived/article-translations/en"),
      translationFile
    );
    const translatedBytes = readFileSync(translationFile);
    if (hash(translatedBytes) !== translationSha256)
      throw new Error("Corrupt article translation bytes");
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const protectedContent = assertTranslationIntegrity(
      decoder.decode(currentBytes),
      decoder.decode(translatedBytes),
      extname(sourcePath) === ".mdx" ? "mdx" : "md",
      markdownFeatures
    );
    if (
      protectedContent.imageSources.some(
        (url) => !url.startsWith("/") && !/^[a-z][a-z0-9+.-]*:/i.test(url)
      )
    )
      throw new Error(
        "Relative translation image/media assets are unsupported until a canonical asset resolver is provided"
      );
    return {
      sourcePath,
      targetLocale: "en",
      sourceSha256,
      translationSha256,
      translationPath: String(translationPath),
      originalDocsRevision,
      status: "available",
      collectionId: translationSha256,
    };
  });
}

export function translationForArticle(
  filePath: string | undefined,
  translations: readonly ArticleTranslation[],
  docsRoot = resolve("data/articles")
) {
  if (!filePath) return undefined;
  const sourcePath = relative(docsRoot, resolve(filePath)).split(sep).join("/");
  return translations.find(
    (translation) => translation.sourcePath === sourcePath
  );
}
