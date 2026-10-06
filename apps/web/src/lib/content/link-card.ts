import { externalHttpUrl } from "@workspace/md";
import { readFileSync } from "node:fs";

export interface LinkCardProps {
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly image?: string;
  readonly siteName?: string;
  readonly presentation?: {
    readonly locale: string;
    readonly summaryLines: readonly [string, string, string];
  };
}

/** Historical spike compatibility; production uses LinkCardProps. */
export type LinkCardData = LinkCardProps;

export type LinkCardResolver = (url: string) => LinkCardProps | undefined;

const manifestUrl = new URL(
  "../../../data/articles/derived/external-links.json",
  import.meta.url
);

export function createLinkCardResolver(records: unknown): LinkCardResolver {
  const metadata = new Map<string, LinkCardProps>();

  if (Array.isArray(records)) {
    for (const record of records) {
      const projected = projectExternalLinkRecord(record);

      if (projected) {
        metadata.set(projected.url, projected);
      }
    }
  }

  return (value) => {
    const url = externalHttpUrl(value);
    return url ? metadata.get(url) : undefined;
  };
}

export function projectExternalLinkRecord(
  value: unknown
): LinkCardProps | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const rawUrl = value["url"];
  const rawTitle = value["title"];
  const rawDescription = value["description"];

  const url = typeof rawUrl === "string" ? externalHttpUrl(rawUrl) : undefined;
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";

  if (!url || !title) {
    return undefined;
  }

  if (rawDescription !== undefined && typeof rawDescription !== "string") {
    return undefined;
  }

  const description = rawDescription?.trim();
  const preview =
    isRecord(value["preview"]) && value["preview"]["state"] === "available"
      ? value["preview"]
      : undefined;
  const image =
    preview && typeof preview["image"] === "string"
      ? externalHttpUrl(preview["image"])
      : undefined;
  const siteName =
    preview && typeof preview["siteName"] === "string"
      ? preview["siteName"].trim()
      : undefined;
  const presentation = projectPresentation(value["presentation"]);

  return {
    url,
    title,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(siteName ? { siteName } : {}),
    ...(presentation ? { presentation } : {}),
  };
}

function projectPresentation(value: unknown): LinkCardProps["presentation"] {
  if (!isRecord(value) || typeof value["locale"] !== "string") return;
  const lines = value["summaryLines"];
  if (
    !Array.isArray(lines) ||
    lines.length !== 3 ||
    !lines.every(
      (line): line is string =>
        typeof line === "string" &&
        !!line.trim() &&
        line === line.trim() &&
        !/[\r\n]/.test(line)
    )
  )
    return;
  try {
    const locale = Intl.getCanonicalLocales(value["locale"])[0];
    if (locale)
      return { locale, summaryLines: [lines[0]!, lines[1]!, lines[2]!] };
  } catch {
    /* Malformed optional presentation leaves the basic card usable. */
  }
  return undefined;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const resolveLinkCardData = createLinkCardResolver(loadExternalLinkManifest());

export default resolveLinkCardData;
