import { withBasePath } from "../utils";
export interface ArticleVisualModel {
  kind: "flow" | "type" | "geometry" | "image";
  label: string;
  keyword: string;
  src?: string;
  alt?: string;
}
export interface HomeStory {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt?: string;
  readingMinutes: number;
  tags: string[];
  visual: ArticleVisualModel;
  language?: "ko" | "en";
}
export interface TagIndex {
  order: string[];
  counts: Record<string, number>;
}
export function normalizeTag(tag: string) {
  return tag.normalize("NFKC").trim().toUpperCase();
}
export function buildTagIndex(
  articles: readonly { id: string; tags: readonly string[] }[]
): TagIndex {
  const membership = new Map<string, Set<string>>();
  for (const article of articles) {
    for (const tag of new Set(article.tags.map(normalizeTag).filter(Boolean))) {
      const ids = membership.get(tag) ?? new Set<string>();
      ids.add(article.id);
      membership.set(tag, ids);
    }
  }
  const counts = Object.fromEntries(
    [...membership].map(([tag, ids]) => [tag, ids.size])
  );
  return {
    counts,
    order: Object.keys(counts).sort(
      (a, b) => counts[b]! - counts[a]! || a.localeCompare(b, "en")
    ),
  };
}
export function sortedTags(tags: readonly string[], index: TagIndex) {
  return [...new Set(tags.map(normalizeTag).filter(Boolean))].sort(
    (a, b) =>
      (index.counts[b] ?? 0) - (index.counts[a] ?? 0) ||
      a.localeCompare(b, "en")
  );
}
// Reversible Site-owned cover choices, keyed by stable source identity, never list index.
const choices: Record<string, "flow" | "type" | "geometry"> = {
  "tech/log/publishing-platform-1": "flow",
  "tech/java/map": "flow",
  "tech/troubleshoot/intellij-spring-container": "type",
  "tech/log/share-mobile-date-without-tethering": "geometry",
  "tech/log/woowa-precourse-init-project": "geometry",
  "tech/log/woowa-precourse-utility": "type",
  "tech/log/woowa-precourse-parameterized-test": "flow",
  "tech/java/parameterized-test": "type",
  "tech/java/pattern": "type",
  "tech/log/tdd-dev-flow": "flow",
  "tech/troubleshoot/vscode-invalid-wsl-distribution": "geometry",
};
export function articleVisual(
  article: { id: string; title: string; tags: readonly string[] },
  cover?: string,
  basePath = import.meta.env.BASE_URL
): ArticleVisualModel {
  const keyword = article.tags.map(normalizeTag).find(Boolean) ?? "FIELD NOTES";
  if (cover)
    return {
      kind: "image",
      src: cover,
      alt: "",
      label: article.title,
      keyword,
    };
  return {
    kind: choices[article.id] ?? "type",
    ...(choices[article.id]
      ? {
          src: withBasePath(
            `/images/article-covers/${article.id.replaceAll("/", "-")}.svg`,
            basePath
          ),
        }
      : {}),
    label: article.title.replaceAll("`", ""),
    keyword,
  };
}
