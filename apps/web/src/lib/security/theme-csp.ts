import type { AstroIntegration } from "astro";

import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// React SSR emits next-themes' bootstrap outside Astro's processed scripts.
// Authorize only that explicitly marked script, using its final emitted bytes.
export function finalizeThemeCsp(html: string): string {
  const scripts = [
    ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g),
  ].filter(([, attributes]) =>
    /\bdata-site-theme="bootstrap"/.test(attributes!)
  );
  if (scripts.length !== 1 || /\bsrc\s*=/.test(scripts[0]![1]!)) {
    throw new Error("Expected one inline Fumadocs theme bootstrap");
  }
  const hash = `sha256-${createHash("sha256").update(scripts[0]![2]!).digest("base64")}`;
  let found = false;
  const updated = html.replace(
    /<meta\s+http-equiv="content-security-policy"\s+content="([^"]*)"\s*\/?\s*>/gi,
    (meta, content: string) => {
      if (found) throw new Error("Expected one Astro CSP meta element");
      found = true;
      if (
        !/script-src\s/.test(content) ||
        /script-src[^;]*'unsafe-(inline|eval)'/.test(content)
      ) {
        throw new Error(
          "Expected script policy without unsafe-inline or unsafe-eval"
        );
      }
      const policy = content.replace(
        /(script-src(?:-elem)?\s+)([^;]*)/g,
        (_: string, start: string, values: string) =>
          `${start}${values.includes(`'${hash}'`) ? values : `${values} '${hash}'`}`
      );
      return meta.replace(content, policy);
    }
  );
  if (!found) throw new Error("Expected Astro CSP meta element");
  return updated;
}

export function themeCsp(): AstroIntegration {
  return {
    name: "site-theme-csp",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const root = fileURLToPath(dir);
        for (const file of await readdir(root, { recursive: true })) {
          if (!file.endsWith(".html")) continue;
          const path = join(root, file);
          const html = await readFile(path, "utf8");
          // Generated redirect pages may not contain the application shell.
          if (!html.includes('data-site-theme="bootstrap"')) continue;
          await writeFile(path, finalizeThemeCsp(html));
        }
      },
    },
  };
}
