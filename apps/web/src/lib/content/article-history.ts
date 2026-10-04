import { execFileSync } from "node:child_process";
import { isAbsolute, relative, resolve, sep } from "node:path";

export interface ArticleGitHistory {
  readonly firstAuthorDate?: Date;
  readonly lastAuthorDate?: Date;
}

const docsRoot = resolve("data/articles");
const cache = new Map<string, ArticleGitHistory | undefined>();

function git(args: string[]) {
  return execFileSync("git", ["-C", docsRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

export function toDocsRelativePath(filePath: string) {
  const path = relative(docsRoot, resolve(filePath));
  if (!path || path === "." || path.startsWith("..") || isAbsolute(path)) {
    return undefined;
  }
  return path.split(sep).join("/");
}

export function readArticleGitHistory(
  filePath: string | undefined,
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

    const history = {
      firstAuthorDate: revisions.at(-1),
      lastAuthorDate: revisions[0],
    };
    cache.set(path, history);
    return history;
  } catch {
    cache.set(path, undefined);
    return undefined;
  }
}
