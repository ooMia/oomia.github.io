import { externalHttpUrl } from "@workspace/md/runtime";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { readArticlePreviews } from "./article-previews";
import { projectExternalLinkRecord } from "./link-card";

const manifests = [
  "derived/external-links.json",
  "derived/external-links-unavailable.json",
  "derived/article-previews.json",
];

/** Validate the Docs-owned preparation attestation within one immutable checkout. */
export function verifyDocsConsumption(docsRoot = resolve("data/articles")) {
  const fail: (reason: string) => never = (reason) => {
    throw new Error(
      `Docs snapshot is not ready for production: ${reason}. Wait for Docs main preparation to converge, then start a new release.`
    );
  };
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", docsRoot, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  const checkedFile = (path: string) => {
    const absolute = realpathSync(resolve(docsRoot, path));
    const inside = relative(realpathSync(docsRoot), absolute);
    if (isAbsolute(inside) || inside === ".." || inside.startsWith(`..${sep}`))
      fail("consumed file escapes the Docs checkout");
    return absolute;
  };
  const path = resolve(docsRoot, "derived/site-consumption.json");
  if (!existsSync(path)) fail("missing derived/site-consumption.json");
  const marker: unknown = JSON.parse(
    readFileSync(checkedFile("derived/site-consumption.json"), "utf8")
  );
  if (
    !isRecord(marker) ||
    marker["schemaVersion"] !== 1 ||
    marker["canonicalTree"] !== git("rev-parse", "HEAD:content") ||
    git("status", "--porcelain", "--untracked-files=all", "--", "content")
  )
    fail("canonical content does not match the prepared content tree");
  const engine = marker["engine"];
  if (
    !isRecord(engine) ||
    typeof engine["revision"] !== "string" ||
    !/^[a-f0-9]{40}$/.test(engine["revision"]) ||
    typeof engine["runId"] !== "string" ||
    !/^[1-9][0-9]*$/.test(engine["runId"])
  )
    fail("invalid Engine artifact provenance");
  const counts = marker["externalLinks"];
  if (
    !isRecord(counts) ||
    !["candidates", "successful", "unavailable"].every(
      (field) =>
        Number.isSafeInteger(counts[field]) && Number(counts[field]) >= 0
    ) ||
    counts["candidates"] !==
      Number(counts["successful"]) + Number(counts["unavailable"])
  )
    fail("invalid external-link candidate coverage");
  const artifacts = marker["artifacts"];
  if (!Array.isArray(artifacts)) fail("missing artifact digests");
  for (const value of manifests) {
    if (existsSync(resolve(docsRoot, value))) checkedFile(value);
  }
  const previews = readArticlePreviews(docsRoot);
  if (previews.length) {
    const previewManifest = JSON.parse(
      readFileSync(resolve(docsRoot, "derived/article-previews.json"), "utf8")
    );
    for (const record of previewManifest.records) {
      if (
        typeof record.sourceSha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(record.sourceSha256) ||
        createHash("sha256")
          .update(readFileSync(checkedFile(record.sourcePath)))
          .digest("hex") !== record.sourceSha256
      )
        fail(
          `article preview does not match its canonical source: ${record.sourcePath}`
        );
    }
  }
  const required = new Set([
    ...manifests.filter((value) => existsSync(resolve(docsRoot, value))),
    ...previews.map((value) => `derived/article-previews/${value.sha256}.png`),
  ]);
  // The producer always persists both success and unavailable sets, including [].
  for (const value of manifests.slice(0, 2)) {
    if (!required.has(value)) fail(`missing ${value}`);
  }
  const seen = new Set<string>();
  let previous = "";
  const namespace = realpathSync(resolve(docsRoot, "derived"));
  for (const artifact of artifacts) {
    if (!isRecord(artifact)) fail("invalid artifact digest entry");
    const value = artifact["path"];
    const digest = artifact["sha256"];
    if (
      typeof value !== "string" ||
      !required.has(value) ||
      seen.has(value) ||
      value <= previous ||
      typeof digest !== "string" ||
      !/^[a-f0-9]{64}$/.test(digest)
    )
      fail("unknown, duplicate, unsorted or invalid artifact digest");
    seen.add(value);
    previous = value;
    const absolute = checkedFile(value);
    const inside = relative(namespace, absolute);
    if (isAbsolute(inside) || inside === ".." || inside.startsWith(`..${sep}`))
      fail("artifact escapes the derived namespace");
    if (
      createHash("sha256").update(readFileSync(absolute)).digest("hex") !==
      digest
    )
      fail(`artifact bytes do not match the attestation: ${value}`);
  }
  if (required.size !== seen.size)
    fail("consumed artifacts are not all attested");
  const records: unknown = JSON.parse(
    readFileSync(resolve(docsRoot, "derived/external-links.json"), "utf8")
  );
  const unavailable: unknown = JSON.parse(
    readFileSync(
      resolve(docsRoot, "derived/external-links-unavailable.json"),
      "utf8"
    )
  );
  if (!Array.isArray(records) || !Array.isArray(unavailable))
    fail("unsupported external-link manifest schema");
  const successfulUrls = new Set<string>();
  for (const record of records) {
    const projected = projectExternalLinkRecord(record);
    if (!projected || successfulUrls.has(projected.url))
      fail("invalid or duplicate successful external-link metadata");
    successfulUrls.add(projected.url);
  }
  const unavailableUrls = new Set<string>();
  for (const value of unavailable) {
    if (!isRecord(value)) fail("invalid unavailable candidate");
    const url =
      typeof value["url"] === "string"
        ? externalHttpUrl(value["url"])
        : undefined;
    if (
      !url ||
      new URL(url).username ||
      new URL(url).password ||
      value["state"] !== "unavailable" ||
      !["provider-failure", "timeout"].includes(String(value["failure"])) ||
      !["source", "note", "request"].includes(String(value["stage"])) ||
      (value["semanticRecoveryId"] !== undefined &&
        (typeof value["semanticRecoveryId"] !== "string" ||
          !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value["semanticRecoveryId"]))) ||
      Object.keys(value).some(
        (key) =>
          !["url", "state", "failure", "stage", "semanticRecoveryId"].includes(
            key
          )
      ) ||
      successfulUrls.has(url) ||
      unavailableUrls.has(url)
    )
      fail("unsupported, duplicate or overlapping unavailable candidate");
    unavailableUrls.add(url);
  }
  return {
    canonicalTree: marker["canonicalTree"],
    candidates: counts["candidates"],
    successful: counts["successful"],
    unavailable: counts["unavailable"],
    artifacts: seen.size,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
