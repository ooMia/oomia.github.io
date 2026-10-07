import type { APIRoute } from "astro";

import { readArticlePreviews } from "@/lib/content/article-previews";

export function getStaticPaths() {
  return [
    ...new Map(
      readArticlePreviews().map((preview) => [preview.sha256, preview])
    ).values(),
  ].map((preview) => ({
    params: { hash: preview.sha256 },
    props: { bytes: preview.bytes },
  }));
}
export const GET: APIRoute = ({ props }) =>
  new Response(props["bytes"], { headers: { "Content-Type": "image/png" } });
