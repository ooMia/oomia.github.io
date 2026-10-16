export function withBasePath(path: string, base?: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = base?.replace(/^\/+|\/+$/g, "") ?? "";

  if (!normalizedBase) return normalizedPath;
  return `/${normalizedBase}${normalizedPath}`;
}
