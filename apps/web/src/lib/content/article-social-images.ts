import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";

import type { ArticleMetadata } from "./article-metadata";
import type { ArticlePreview } from "./article-previews";
import type { ArticleSocialImage } from "./article-social";

import { ArticleVisual } from "../../components/presentation/ArticleVisual";
import { articleVisual } from "../presentation/articles";
import { previewForArticle, readArticlePreviews } from "./article-previews";

interface SocialImageAsset {
  sha256: string;
  bytes: Uint8Array;
  image: ArticleSocialImage;
}

const covers = new Map<string, Promise<SocialImageAsset>>();

function imageAsset(bytes: Uint8Array, width: number, height: number) {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    sha256,
    bytes,
    image: {
      path: `/social-previews/${sha256}.png`,
      width,
      height,
      mediaType: "image/png" as const,
    },
  };
}

/** Site-owned local covers complement validated Docs previews without capture or network access. */
export async function readArticleSocialImages(
  articles: readonly {
    metadata: ArticleMetadata;
    entry: { filePath?: string };
  }[],
  previews: readonly ArticlePreview[] = readArticlePreviews(),
  publicRoot = resolve("public")
) {
  const images = new Map<string, SocialImageAsset>();
  for (const { metadata, entry } of articles) {
    const preview = previewForArticle(entry.filePath, previews);
    if (preview) {
      images.set(metadata.id, imageAsset(preview.bytes, 1200, 630));
      continue;
    }
    const visual = articleVisual(metadata, undefined, "/");
    let input: string | Buffer;
    if (visual.src) {
      if (!visual.src.startsWith("/images/article-covers/"))
        throw new Error("Social cover must be a local Article cover");
      const namespace = realpathSync(
        resolve(publicRoot, "images/article-covers")
      );
      input = realpathSync(resolve(publicRoot, `.${visual.src}`));
      const inside = relative(namespace, input);
      if (
        isAbsolute(inside) ||
        inside === ".." ||
        inside.startsWith(`..${sep}`)
      )
        throw new Error(
          "Social cover escapes the local Article cover namespace"
        );
    } else {
      input = Buffer.from(
        renderToStaticMarkup(createElement(ArticleVisual, { visual }))
      );
    }
    const key =
      typeof input === "string"
        ? input
        : createHash("sha256").update(input).digest("hex");
    let asset = covers.get(key);
    if (!asset) {
      asset = sharp(input)
        .resize({ width: 1200 })
        .png()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => imageAsset(data, info.width, info.height));
      covers.set(key, asset);
    }
    images.set(metadata.id, await asset);
  }
  return images;
}
