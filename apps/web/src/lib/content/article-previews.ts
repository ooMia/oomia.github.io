import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export interface ArticlePreview {
  sourcePath: string;
  sha256: string;
  bytes: Uint8Array;
}

/** Docs owns the manifest. Unsupported/corrupt derived inputs fail closed, absent manifest is valid. */
export function readArticlePreviews(
  docsRoot = resolve("data/articles")
): ArticlePreview[] {
  const manifest = resolve(docsRoot, "derived/article-previews.json");
  if (!existsSync(manifest)) return [];
  const value = JSON.parse(readFileSync(manifest, "utf8"));
  if (value?.schemaVersion !== 1 || !Array.isArray(value.records))
    throw new Error("Unsupported article preview manifest");
  const seen = new Set<string>();
  return value.records.map((record: Record<string, unknown>) => {
    const sourcePath = record["sourcePath"];
    const sha256 = record["sha256"];
    if (
      typeof sourcePath !== "string" ||
      !/^content\/articles\/(?!.*(?:^|\/)\.\.?\/).+\.(md|mdx)$/.test(
        sourcePath
      ) ||
      sourcePath.includes("\\") ||
      typeof sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(sha256) ||
      seen.has(sourcePath)
    )
      throw new Error("Invalid or duplicate article preview identity/hash");
    seen.add(sourcePath);
    if (
      record["imagePath"] !== `derived/article-previews/${sha256}.png` ||
      record["width"] !== 1200 ||
      record["height"] !== 630 ||
      record["mediaType"] !== "image/png"
    )
      throw new Error("Invalid article preview binary reference/profile");
    const binary = realpathSync(resolve(docsRoot, String(record["imagePath"])));
    const namespace = realpathSync(
      resolve(docsRoot, "derived/article-previews")
    );
    const inside = relative(namespace, binary);
    if (isAbsolute(inside) || inside.startsWith(`..${sep}`) || inside === "..")
      throw new Error("Preview binary escapes derived namespace");
    const bytes = readFileSync(binary);
    if (
      bytes.length < 33 ||
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.readUInt32BE(16) !== 1200 ||
      bytes.readUInt32BE(20) !== 630 ||
      record["bytes"] !== bytes.length ||
      createHash("sha256").update(bytes).digest("hex") !== sha256
    )
      throw new Error("Corrupt article preview binary");
    return { sourcePath, sha256, bytes };
  });
}

export function previewForArticle(
  filePath: string | undefined,
  previews: readonly ArticlePreview[],
  docsRoot = resolve("data/articles")
) {
  if (!filePath) return undefined;
  const sourcePath = relative(docsRoot, resolve(filePath)).split(sep).join("/");
  return previews.find((preview) => preview.sourcePath === sourcePath);
}
