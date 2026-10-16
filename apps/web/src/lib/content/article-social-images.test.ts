import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { expect, it } from "vite-plus/test";

import { mapArticleMetadata } from "./article-metadata";
import { readArticleSocialImages } from "./article-social-images";

it("uses validated Docs preview bytes before rasterizing a local cover with its real dimensions", async () => {
  const metadata = mapArticleMetadata("tech/java/map", {
    title: "Map",
    description: "Map notes",
    author: "oomia",
  });
  const sourcePath = "content/articles/map.md";
  const articles = [
    {
      metadata,
      entry: { filePath: resolve("data/articles", sourcePath) },
    },
  ];
  const publicRoot = fileURLToPath(new URL("../../../public", import.meta.url));
  const fallback = (
    await readArticleSocialImages(articles, [], publicRoot)
  ).get(metadata.id)!;
  const binary = await sharp(fallback.bytes).metadata();
  expect(binary.format).toBe("png");
  expect(binary.width).toBe(fallback.image.width);
  expect(binary.height).toBe(fallback.image.height);
  expect(binary.width! / binary.height!).toBeCloseTo(400 / 260);

  const preview = {
    sourcePath,
    sha256: "a".repeat(64),
    bytes: new Uint8Array([1, 2, 3]),
  };
  const selected = (
    await readArticleSocialImages(articles, [preview], publicRoot)
  ).get(metadata.id)!;
  expect(selected.bytes).toBe(preview.bytes);
  expect(selected.image).toMatchObject({
    width: 1200,
    height: 630,
    mediaType: "image/png",
  });

  const unmapped = { ...metadata, id: "new/article" };
  const generic = (
    await readArticleSocialImages(
      [{ metadata: unmapped, entry: {} }],
      [],
      publicRoot
    )
  ).get(unmapped.id)!;
  expect((await sharp(generic.bytes).metadata()).format).toBe("png");
  expect(generic.image.width).toBeGreaterThan(0);
  expect(generic.image.height).toBeGreaterThan(0);
});
