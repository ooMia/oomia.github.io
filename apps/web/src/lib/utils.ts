export function normalizeSiteUrl(
  value: string | undefined,
  fallback = "http://localhost:4321"
) {
  const next = value?.trim() || fallback
  return next.replace(/\/+$/, "")
}

export function normalizeBasePath(value: string | undefined) {
  const next = value?.trim()
  if (!next) return "/"
  return next.replace(/^\/+|\/+$/g, "")
}

export function withBasePath(path: string, base?: string) {
  if (!base) return path
  return `/${base.replace(/^\/+|\/+$/g, "")}${path.startsWith("/") ? path : `/${path}`}`
}
