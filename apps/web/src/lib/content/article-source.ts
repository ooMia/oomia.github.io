import { relative, resolve, sep } from "node:path";
/** Stable canonical source path; independent from listing order and locale route. */
export function articleSourcePath(
  filePath: string | undefined,
  docsRoot = resolve("data/articles")
) {
  return filePath
    ? relative(docsRoot, resolve(filePath)).split(sep).join("/")
    : undefined;
}
