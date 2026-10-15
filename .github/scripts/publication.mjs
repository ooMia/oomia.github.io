import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

const sha = /^[a-f0-9]{40}$/;
const markerPath = ".well-known/oomia-publication.json";

async function mainRevision(repository, token, fetcher) {
  if (!token) throw new Error(`Missing read credential for ${repository}`);
  const response = await fetcher(
    `https://api.github.com/repos/ooMia/${repository}/git/ref/heads/main`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!response.ok)
    throw new Error(
      `Cannot resolve ${repository} main: HTTP ${response.status}`
    );
  const revision = (await response.json()).object?.sha;
  if (!sha.test(revision ?? ""))
    throw new Error(`Invalid ${repository} main revision`);
  return revision;
}

/** Resolve Docs main once; a notification is an expectation, never a moving checkout. */
export async function selectPublication({
  siteRevision,
  requestedDocsRevision = "",
  siteUrl,
  basePath = "/",
  docsToken,
  siteToken,
  fetcher = fetch,
}) {
  if (
    !sha.test(siteRevision ?? "") ||
    (requestedDocsRevision && !sha.test(requestedDocsRevision))
  )
    throw new Error("Publication revisions must be full Git SHAs");
  const siteMain = await mainRevision("oomia.github.io", siteToken, fetcher);
  if (siteMain !== siteRevision)
    return { publish: false, reason: "stale Site revision" };
  const docsRevision = await mainRevision(
    "oomia.github.io.docs",
    docsToken,
    fetcher
  );
  if (requestedDocsRevision && requestedDocsRevision !== docsRevision)
    return { publish: false, reason: "stale Docs notification", docsRevision };
  const markerUrl = new URL(
    `${basePath.replace(/\/?$/, "/")}${markerPath}`,
    siteUrl
  );
  markerUrl.searchParams.set("revision", `${siteRevision}-${docsRevision}`);
  // An unavailable public marker means rebuild. API/provenance failures above
  // remain fatal; public delivery is only an optimization for duplicate events.
  try {
    const response = await fetcher(markerUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      const prior = await response.json();
      if (
        prior.schemaVersion === 1 &&
        prior.siteRevision === siteRevision &&
        prior.docsRevision === docsRevision
      )
        return {
          publish: false,
          reason: "Site/Docs pair already public",
          docsRevision,
        };
    }
  } catch {
    /* A previous deployment may not expose a marker yet. */
  }
  return { publish: true, reason: "new Site/Docs pair", docsRevision };
}

export async function runSelection(env = process.env) {
  if (
    env.GITHUB_REPOSITORY !== "ooMia/oomia.github.io" ||
    env.GITHUB_REF !== "refs/heads/main"
  )
    throw new Error("Publication requires canonical Site main");
  const decision = await selectPublication({
    siteRevision: env.GITHUB_SHA,
    requestedDocsRevision: env.REQUESTED_DOCS_REVISION,
    siteUrl: env.SITE_URL,
    basePath: env.BASE_PATH,
    docsToken: env.DOCS_READ_TOKEN,
    siteToken: env.GITHUB_TOKEN,
  });
  if (!env.GITHUB_OUTPUT || !env.GITHUB_ENV)
    throw new Error("Actions output paths are required");
  await appendFile(
    env.GITHUB_OUTPUT,
    `publish=${decision.publish}\ndocs_revision=${decision.docsRevision ?? ""}\n`
  );
  if (decision.publish) {
    await appendFile(
      env.GITHUB_ENV,
      `DOCS_CHECKOUT_REVISION=${decision.docsRevision}\n`
    );
    // Astro copies this into the Pages artifact. A failed build/verification
    // cannot deploy it, so it proves which successful pair is actually public.
    const file = `apps/web/public/${markerPath}`;
    await mkdir(dirname(file), { recursive: true });
    await writeFile(
      file,
      `${JSON.stringify({ schemaVersion: 1, siteRevision: env.GITHUB_SHA, docsRevision: decision.docsRevision })}\n`
    );
  }
  console.log(`Publication: ${decision.reason}.`);
  if (env.GITHUB_STEP_SUMMARY)
    await appendFile(
      env.GITHUB_STEP_SUMMARY,
      `\n## Production selection\n\n- Result: ${decision.reason}\n- Site: \`${env.GITHUB_SHA}\`\n- Docs: \`${decision.docsRevision ?? "not selected"}\`\n`
    );
  return decision;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await runSelection();
