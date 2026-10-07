import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

import { verifyDocsConsumption } from "./docs-consumption";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "docs-consumption-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  mkdirSync(join(root, "content/articles"), { recursive: true });
  mkdirSync(join(root, "derived"), { recursive: true });
  writeFileSync(join(root, "content/articles/example.mdx"), "Authored source");
  git("init");
  git("add", "content");
  git(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "Canonical source"
  );
  for (const path of ["external-links.json", "external-links-unavailable.json"])
    writeFileSync(join(root, "derived", path), "[]");
  const marker = {
    schemaVersion: 1,
    canonicalTree: git("rev-parse", "HEAD:content"),
    engine: { revision: "a".repeat(40), runId: "123" },
    externalLinks: { candidates: 0, successful: 0, unavailable: 0 },
    artifacts: [
      "derived/external-links-unavailable.json",
      "derived/external-links.json",
    ].map((path) => ({
      path,
      sha256: createHash("sha256")
        .update(readFileSync(join(root, path)))
        .digest("hex"),
    })),
  };
  const save = () =>
    writeFileSync(
      join(root, "derived/site-consumption.json"),
      JSON.stringify(marker)
    );
  save();
  return { root, git, marker, save };
}

describe("Docs production consumption attestation", () => {
  it("accepts prepared local artifacts and rejects missing or changed canonical/derived state", () => {
    const { root, marker, save } = fixture();
    try {
      expect(verifyDocsConsumption(root)).toMatchObject({
        candidates: 0,
        successful: 0,
        unavailable: 0,
        artifacts: 2,
      });
      writeFileSync(
        join(root, "content/articles/example.mdx"),
        "Changed authored source"
      );
      expect(() => verifyDocsConsumption(root)).toThrow(/canonical content/);
      writeFileSync(
        join(root, "content/articles/example.mdx"),
        "Authored source"
      );
      writeFileSync(
        join(root, "content/articles/untracked.mdx"),
        "Unattested source"
      );
      expect(() => verifyDocsConsumption(root)).toThrow(/canonical content/);
      rmSync(join(root, "content/articles/untracked.mdx"));
      marker.canonicalTree = "b".repeat(40);
      save();
      expect(() => verifyDocsConsumption(root)).toThrow(/canonical content/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed on corrupt provenance, coverage or artifact bytes", () => {
    const { root, marker, save } = fixture();
    try {
      marker.engine.runId = "unknown";
      save();
      expect(() => verifyDocsConsumption(root)).toThrow(
        /Engine artifact provenance/
      );
      marker.engine.runId = "123";
      marker.externalLinks.unavailable = 1;
      save();
      expect(() => verifyDocsConsumption(root)).toThrow(/candidate coverage/);
      marker.externalLinks.unavailable = 0;
      save();
      writeFileSync(join(root, "derived/external-links.json"), "[{}]");
      expect(() => verifyDocsConsumption(root)).toThrow(/artifact bytes/);
      writeFileSync(join(root, "derived/external-links.json"), "[]");
      marker.artifacts.pop();
      save();
      expect(() => verifyDocsConsumption(root)).toThrow(/not all attested/);
      rmSync(join(root, "derived/site-consumption.json"));
      expect(() => verifyDocsConsumption(root)).toThrow(
        /missing derived\/site-consumption/
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects unknown, duplicate and unsorted artifact entries", () => {
    const { root, marker, save } = fixture();
    const original = [...marker.artifacts];
    try {
      marker.artifacts = [...original, original[0]!];
      save();
      expect(() => verifyDocsConsumption(root)).toThrow(/duplicate, unsorted/);
      marker.artifacts = [...original].reverse();
      save();
      expect(() => verifyDocsConsumption(root)).toThrow(/duplicate, unsorted/);
      marker.artifacts = [
        { path: "derived/../content/private", sha256: "a".repeat(64) },
      ];
      save();
      expect(() => verifyDocsConsumption(root)).toThrow(/unknown/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects systemic codes, duplicate failures and success/failure overlap", () => {
    const { root, marker, save } = fixture();
    const failure = {
      url: "https://example.com/a",
      state: "unavailable",
      failure: "provider-failure",
      stage: "source",
    };
    const check = (records: unknown, unavailable: unknown) => {
      writeFileSync(
        join(root, "derived/external-links.json"),
        JSON.stringify(records)
      );
      writeFileSync(
        join(root, "derived/external-links-unavailable.json"),
        JSON.stringify(unavailable)
      );
      for (const artifact of marker.artifacts)
        artifact.sha256 = createHash("sha256")
          .update(readFileSync(join(root, artifact.path)))
          .digest("hex");
      save();
      expect(() => verifyDocsConsumption(root)).toThrow(
        /unavailable candidate/
      );
    };
    try {
      check([], [{ ...failure, failure: "authentication" }]);
      check([], [failure, failure]);
      check([{ url: failure.url, title: "Success" }], [failure]);
      check([], [{ ...failure, unexpected: "unknown producer schema" }]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a preview whose binary is valid but authored source changed", () => {
    const { root, marker, save } = fixture();
    try {
      const bytes = Buffer.alloc(33);
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
      bytes.writeUInt32BE(1200, 16);
      bytes.writeUInt32BE(630, 20);
      const hash = createHash("sha256").update(bytes).digest("hex");
      const path = "derived/article-previews/" + hash + ".png";
      mkdirSync(join(root, "derived/article-previews"));
      writeFileSync(join(root, path), bytes);
      writeFileSync(
        join(root, "derived/article-previews.json"),
        JSON.stringify({
          schemaVersion: 1,
          records: [
            {
              sourcePath: "content/articles/example.mdx",
              sourceSha256: "f".repeat(64),
              imagePath: path,
              sha256: hash,
              bytes: bytes.length,
              width: 1200,
              height: 630,
              mediaType: "image/png",
            },
          ],
        })
      );
      marker.artifacts.unshift(
        ...["derived/article-previews.json", path].map((path) => ({
          path,
          sha256: createHash("sha256")
            .update(readFileSync(join(root, path)))
            .digest("hex"),
        }))
      );
      save();
      expect(() => verifyDocsConsumption(root)).toThrow(
        /preview does not match its canonical source/
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
