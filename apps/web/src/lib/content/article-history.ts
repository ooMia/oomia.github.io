import { execFileSync } from "node:child_process";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export interface ArticleGitHistory {
  readonly firstAuthorDate: Date;
  readonly lastAuthorDate: Date;
}

const appRoot = fileURLToPath(new URL("../../../", import.meta.url));
const docsRoot = resolve(appRoot, "data/articles");
const cache = new Map<string, ArticleGitHistory | undefined>();

function git(args: string[]) {
  return execFileSync("git", ["-C", docsRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

export function toDocsRelativePath(filePath: string) {
  const sourcePath = isAbsolute(filePath)
    ? filePath
    : resolve(appRoot, filePath);
  const path = relative(docsRoot, sourcePath);

  if (
    !path ||
    path === "." ||
    path === ".." ||
    path.startsWith(`..${sep}`) ||
    isAbsolute(path)
  ) {
    return undefined;
  }

  return path.split(sep).join("/");
}

export function readArticleGitHistory(
  filePath: string | undefined
): ArticleGitHistory | undefined {
  if (!filePath) return undefined;

  const path = toDocsRelativePath(filePath);
  if (!path) return undefined;

  if (cache.has(path)) return cache.get(path);

  try {
    if (git(["rev-parse", "--is-shallow-repository"]) !== "false") {
      cache.set(path, undefined);
      return undefined;
    }

    const revisions = git([
      "log",
      "--follow",
      "--no-merges",
      "--format=%aI",
      "--",
      path,
    ])
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((value) => !Number.isNaN(value.getTime()));

    if (revisions.length === 0) {
      cache.set(path, undefined);
      return undefined;
    }

    const firstAuthorDate = revisions.at(-1);
    const lastAuthorDate = revisions[0];
    if (!firstAuthorDate || !lastAuthorDate) {
      cache.set(path, undefined);
      return undefined;
    }

    const history: ArticleGitHistory = {
      firstAuthorDate,
      lastAuthorDate,
    };
    cache.set(path, history);
    return history;
  } catch {
    cache.set(path, undefined);
    return undefined;
  }
}
