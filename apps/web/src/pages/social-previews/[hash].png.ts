import type { APIRoute } from "astro";

import { readArticlePreviews } from "@/lib/content/article-previews";
import { readArticleSocialImages } from "@/lib/content/article-social-images";
import { getArticleRecords } from "@/lib/content/articles";

export async function getStaticPaths() {
  const previews = readArticlePreviews();
  const images = await readArticleSocialImages(
    await getArticleRecords(),
    previews
  );
  return [
    ...new Map(
      [...previews, ...images.values()].map((image) => [image.sha256, image])
    ).values(),
  ].map((preview) => ({
    params: { hash: preview.sha256 },
    props: { bytes: preview.bytes },
  }));
}
export const GET: APIRoute = ({ props }) =>
  new Response(props["bytes"], { headers: { "Content-Type": "image/png" } });
