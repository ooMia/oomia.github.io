import { withBasePath } from "../utils";

export type SiteLocale = "ko" | "en";

export const SITE_LOCALES = ["ko", "en"] as const;

export function documentLanguage(locale: SiteLocale) {
  return locale === "en" ? "en" : "ko-KR";
}

/** Korean retains its published URLs; only English has a locale prefix. */
export function localizedHomeUrl(locale: SiteLocale, base = "/") {
  return withBasePath(locale === "en" ? "/en/" : "/", base);
}

export function localizedArticleUrl(
  id: string,
  locale: SiteLocale,
  base = "/"
) {
  const segments = id.split("/");
  if (
    segments.some(
      (segment) => !segment || segment === "." || segment === ".."
    ) ||
    id.includes("\\")
  )
    throw new Error("Invalid article route identity");
  const encoded = segments.map(encodeURIComponent).join("/");
  return withBasePath(
    `${locale === "en" ? "/en" : ""}/articles/${encoded}/`,
    base
  );
}

/** Explicit locale navigation avoids treating a deployment base as a locale. */
export function languageSwitchUrl(
  pathname: string,
  target: SiteLocale,
  base = "/"
) {
  const basePrefix = base.replace(/^\/+|\/+$/g, "");
  const prefix = basePrefix ? `/${basePrefix}` : "";
  if (prefix && pathname !== prefix && !pathname.startsWith(`${prefix}/`))
    throw new Error("Path is outside the Site base");
  let path = pathname.slice(prefix.length) || "/";
  if (path === "/en" || path.startsWith("/en/")) path = path.slice(3) || "/";
  if (target === "en") path = `/en${path === "/" ? "/" : path}`;
  return withBasePath(path, base);
}

export function localeDate(
  value: string | Date | undefined,
  locale: SiteLocale
) {
  if (!value) return undefined;
  return new Intl.DateTimeFormat(documentLanguage(locale), {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
