export type EnvironmentInput = Readonly<Record<string, string | undefined>>;
export type DocsCheckoutMode = "pinned" | "main" | "resolved";

export interface SiteEnvironment {
  readonly siteUrl: string;
  readonly basePath: string;
  readonly filterDraftArticles: boolean;
  readonly docsCheckoutMode: DocsCheckoutMode;
  readonly docsCheckoutRevision: string | undefined;
}

export function draftFilterEnabled(value: string | undefined) {
  return value === "true";
}

/** Pure input boundary: external environment wins before this parser is called. */
export function parseSiteEnvironment(input: EnvironmentInput): SiteEnvironment {
  if (input["DOCS_REVISION"] !== undefined)
    throw new Error(
      "DOCS_REVISION is build-derived; use DOCS_CHECKOUT_REVISION to validate the actual checkout"
    );
  const siteUrl =
    (input["SITE_URL"] ?? input["SITE"])?.trim() || "http://localhost:4321";
  const url = new URL(siteUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("SITE_URL must be an HTTP(S) URL without credentials");
  const base = input["BASE_PATH"]?.trim().replace(/^\/+|\/+$/g, "");
  const mode = input["DOCS_CHECKOUT_MODE"] ?? "pinned";
  if (!["pinned", "main", "resolved"].includes(mode))
    throw new Error("Unsupported Docs checkout mode");
  const revision = input["DOCS_CHECKOUT_REVISION"];
  if (mode === "resolved" && !/^[a-f0-9]{40}$/.test(revision ?? ""))
    throw new Error(
      "DOCS_CHECKOUT_REVISION must be a full lowercase Git SHA in resolved mode"
    );
  return {
    siteUrl: siteUrl.replace(/\/+$/, ""),
    // Integration updates happen after Astro's initial normalization. Keep
    // this absolute so nested pages never resolve assets relative to themselves.
    basePath: base ? `/${base}/` : "/",
    // Retain the existing opt-in behavior: only the literal "true" filters drafts.
    filterDraftArticles: draftFilterEnabled(input["FILTER_DRAFT_ARTICLES"]),
    docsCheckoutMode: mode as DocsCheckoutMode,
    docsCheckoutRevision: revision,
  };
}
