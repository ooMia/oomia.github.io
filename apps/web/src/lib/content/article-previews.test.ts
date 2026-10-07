import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vite-plus/test";

import { readArticlePreviews, previewForArticle } from "./article-previews";

it("accepts absent previews, validates derived bytes and maps canonical source identity", () => {
  const root = mkdtempSync(join(tmpdir(), "site-preview-"));
  try {
    expect(readArticlePreviews(root)).toEqual([]);
    const png = Buffer.alloc(33);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
    png.writeUInt32BE(1200, 16);
    png.writeUInt32BE(630, 20);
    const sha256 = createHash("sha256").update(png).digest("hex");
    mkdirSync(join(root, "derived/article-previews"), { recursive: true });
    writeFileSync(join(root, `derived/article-previews/${sha256}.png`), png);
    const record = {
      sourcePath: "content/articles/example.mdx",
      imagePath: `derived/article-previews/${sha256}.png`,
      sha256,
      bytes: png.length,
      width: 1200,
      height: 630,
      mediaType: "image/png",
    };
    const manifest = join(root, "derived/article-previews.json");
    writeFileSync(
      manifest,
      JSON.stringify({ schemaVersion: 1, records: [record] })
    );
    const previews = readArticlePreviews(root);
    expect(
      previewForArticle(join(root, record.sourcePath), previews, root)?.sha256
    ).toBe(sha256);
    writeFileSync(
      manifest,
      JSON.stringify({ schemaVersion: 1, records: [record, record] })
    );
    expect(() => readArticlePreviews(root)).toThrow("duplicate");
    writeFileSync(
      manifest,
      JSON.stringify({
        schemaVersion: 1,
        records: [{ ...record, imagePath: "../../outside.png" }],
      })
    );
    expect(() => readArticlePreviews(root)).toThrow("binary reference");
    writeFileSync(
      manifest,
      JSON.stringify({ schemaVersion: 1, records: [record] })
    );
    writeFileSync(join(root, record.imagePath), "corrupt");
    expect(() => readArticlePreviews(root)).toThrow("Corrupt");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
