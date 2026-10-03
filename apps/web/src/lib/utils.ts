export function normalizeSiteUrl(
  value: string | undefined,
  fallback = "http://localhost:4321"
) {
  const next = value?.trim() || fallback;
  return next.replace(/\/+$/, "");
}

export function normalizeBasePath(value: string | undefined) {
  const next = value?.trim();
  if (!next) return "/";
  return next.replace(/^\/+|\/+$/g, "");
}

export function withBasePath(path: string, base?: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = base?.replace(/^\/+|\/+$/g, "") ?? "";

  if (!normalizedBase) return normalizedPath;
  return `/${normalizedBase}${normalizedPath}`;
}
