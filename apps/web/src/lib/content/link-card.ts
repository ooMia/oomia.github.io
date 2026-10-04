import { readFileSync } from "node:fs";

import type { LinkCardData, LinkCardResolver } from "@workspace/md";

const manifestUrl = new URL(
  "../../../data/articles/derived/external-links.json",
  import.meta.url
);

export function createLinkCardResolver(records: unknown): LinkCardResolver {
  const metadata = new Map<string, LinkCardData>();

  if (Array.isArray(records)) {
    for (const record of records) {
      const projected = projectExternalLinkRecord(record);

      if (projected) {
        metadata.set(projected.url, projected);
      }
    }
  }

  return (value) => {
    const url = normalizeExternalHttpUrl(value);
    return url ? metadata.get(url) : undefined;
  };
}

export function projectExternalLinkRecord(
  value: unknown
): LinkCardData | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const rawUrl = value["url"];
  const rawTitle = value["title"];
  const rawDescription = value["description"];

  const url =
    typeof rawUrl === "string" ? normalizeExternalHttpUrl(rawUrl) : undefined;
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";

  if (!url || !title) {
    return undefined;
  }

  if (rawDescription !== undefined && typeof rawDescription !== "string") {
    return undefined;
  }

  const description = rawDescription?.trim();

  return {
    url,
    title,
    ...(description ? { description } : {}),
  };
}

export function parseExternalLinkManifest(source: string): unknown {
  try {
    return JSON.parse(source);
  } catch {
    return [];
  }
}

function loadExternalLinkManifest(): unknown {
  try {
    return parseExternalLinkManifest(readFileSync(manifestUrl, "utf8"));
  } catch {
    return [];
  }
}

function normalizeExternalHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }

    return url.href;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const resolveLinkCardData = createLinkCardResolver(loadExternalLinkManifest());

export default resolveLinkCardData;
