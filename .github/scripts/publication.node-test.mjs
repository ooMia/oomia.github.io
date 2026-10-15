import assert from "node:assert/strict";
import test from "node:test";

import { selectPublication } from "./publication.mjs";

const siteRevision = "a".repeat(40);
const docsRevision = "b".repeat(40);
const options = {
  siteRevision,
  siteUrl: "https://example.com",
  basePath: "/",
  siteToken: "site-fixture",
  docsToken: "docs-fixture",
};
const json = (value, status = 200) => ({
  ok: status === 200,
  status,
  json: async () => value,
});

function remote({
  site = siteRevision,
  docs = docsRevision,
  marker,
  markerStatus = 404,
} = {}) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/oomia.github.io/git/ref/"))
      return json({ object: { sha: site } });
    if (String(url).includes("/oomia.github.io.docs/git/ref/"))
      return json({ object: { sha: docs } });
    assert.equal(new URL(url).pathname, "/.well-known/oomia-publication.json");
    assert.equal(
      init.headers,
      undefined,
      "Public requests must not contain private tokens"
    );
    return json(marker, markerStatus);
  };
  return { calls, fetcher };
}

test("first publication resolves Docs exactly once and retains its immutable revision", async () => {
  const r = remote();
  assert.deepEqual(
    await selectPublication({ ...options, fetcher: r.fetcher }),
    { publish: true, reason: "new Site/Docs pair", docsRevision }
  );
  assert.equal(
    r.calls.filter((c) => c.url.includes("/oomia.github.io.docs/")).length,
    1
  );
  assert.equal(r.calls[0].init.headers.Authorization, "Bearer site-fixture");
  assert.equal(r.calls[1].init.headers.Authorization, "Bearer docs-fixture");
});

test("already public exact pair skips; changed Site or Docs does not", async () => {
  for (const [marker, expected] of [
    [{ schemaVersion: 1, siteRevision, docsRevision }, false],
    [{ schemaVersion: 1, siteRevision: "c".repeat(40), docsRevision }, true],
    [{ schemaVersion: 1, siteRevision, docsRevision: "c".repeat(40) }, true],
    [{ schemaVersion: 2, siteRevision, docsRevision }, true],
  ]) {
    const r = remote({ marker, markerStatus: 200 });
    assert.equal(
      (await selectPublication({ ...options, fetcher: r.fetcher })).publish,
      expected
    );
  }
});

test("stale notifications and stale Site runs do not build an older release", async () => {
  const docs = remote();
  assert.equal(
    (
      await selectPublication({
        ...options,
        requestedDocsRevision: "c".repeat(40),
        fetcher: docs.fetcher,
      })
    ).reason,
    "stale Docs notification"
  );
  assert.equal(docs.calls.length, 2);
  const site = remote({ site: "c".repeat(40) });
  assert.equal(
    (await selectPublication({ ...options, fetcher: site.fetcher })).reason,
    "stale Site revision"
  );
  assert.equal(site.calls.length, 1);
});

test("invalid input, remote provenance and authorization fail before build", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return json({}, 403);
  };
  await assert.rejects(
    selectPublication({ ...options, requestedDocsRevision: "main", fetcher }),
    /full Git SHAs/
  );
  assert.equal(calls, 0);
  await assert.rejects(
    selectPublication({ ...options, siteToken: "", fetcher }),
    /Missing read credential/
  );
  await assert.rejects(selectPublication({ ...options, fetcher }), /HTTP 403/);
  await assert.rejects(
    selectPublication({
      ...options,
      fetcher: remote({ docs: "moving-main" }).fetcher,
    }),
    /Invalid .* main revision/
  );
});

test("an unreachable public marker rebuilds and nested BASE_PATH stays scoped", async () => {
  const r = remote();
  const fetcher = async (url, init) => {
    if (String(url).includes("api.github.com")) return r.fetcher(url, init);
    assert.equal(
      new URL(url).pathname,
      "/project/.well-known/oomia-publication.json"
    );
    throw new Error("Network unavailable");
  };
  assert.equal(
    (await selectPublication({ ...options, basePath: "/project/", fetcher }))
      .publish,
    true
  );
});
