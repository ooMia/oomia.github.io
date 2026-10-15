import { createHash } from "node:crypto";
import { describe, expect, it } from "vite-plus/test";

import { finalizeThemeCsp } from "./theme-csp";

describe("Fumadocs theme CSP", () => {
  const policy = `<meta http-equiv="content-security-policy" content="object-src 'none'; script-src 'self' 'sha256-existing' 'strict-dynamic'; script-src-attr 'none'; style-src-attr 'unsafe-inline';">`;
  const script = "document.documentElement.classList.add('dark');";
  const page = `${policy}<script data-site-theme="bootstrap">${script}</script><script>untrusted()</script>`;
  it("hashes only the marked bootstrap's exact emitted bytes and is idempotent", () => {
    const result = finalizeThemeCsp(page);
    expect(result).toContain(
      `'sha256-${createHash("sha256").update(script).digest("base64")}'`
    );
    expect(result).not.toContain(
      `'sha256-${createHash("sha256").update("untrusted()").digest("base64")}'`
    );
    expect(finalizeThemeCsp(result)).toBe(result);
  });
  it("rejects missing or ambiguous theme scripts, CSP and weakened script policy", () => {
    for (const html of [
      policy,
      `${page}<script data-site-theme="bootstrap"></script>`,
      page.replace(policy, ""),
      page.replace("'strict-dynamic'", "'unsafe-inline'"),
    ]) {
      expect(() => finalizeThemeCsp(html)).toThrow();
    }
  });
});
