# Site publication

Site owns immutable consumption, build and GitHub Pages delivery. [Docs](https://github.com/ooMia/oomia.github.io.docs/blob/main/docs/enrichment-workflow.md) owns canonical normalization, provider preparation, persistence and the end-to-end authoring flow.

## Development and publication

| Workflow                | Trigger                                                  | Purpose                                                                      |
| ----------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Site CI                 | PR to main/develop                                       | Checks, unit tests, immutable offline fixture, build and output verification |
| Publish Site            | Site main push; main-only dispatch from Docs or operator | Resolve one Docs snapshot, validate readiness, build, verify and deploy      |
| Manual OS compatibility | Explicit dispatch                                        | Optional browser/OS regression diagnostics                                   |

A Docs main push runs Publish Docs. After its trusted Windows preparation persists or reuses a consumable main SHA, Docs requests Publish Site with `docs_revision` set to that full SHA. No operator dispatch is required in the ordinary path once the one-time credential below is configured. Optional metadata enrichment, recovery and deployed-page preview capture remain explicit maintenance operations; their committed changes request fresh Docs convergence automatically.

## Snapshot and duplicate handling

Publish Site runs canonical Site main only. It checks that the triggering Site SHA is still current, resolves Docs main exactly once, and compares an optional notification SHA with that resolved value. An obsolete notification skips rather than publishing older content. The checkout, build cache, output verification and public Article `oomia:docs-revision` all use the same immutable Docs SHA. The stored gitlink remains a local default.

The complete selection/build/deploy workflow shares one non-cancelling `pages` concurrency group. Running delivery is preserved; GitHub may coalesce pending events, so the queue is not FIFO. Current-main checks keep obsolete requests from overwriting newer releases. A main push during a build does not change that build's immutable content; the later convergence requests the next release.

`.well-known/oomia-publication.json` is generated before Astro builds and is included in the Pages artifact. It records the actual Site/Docs pair. If that exact pair is already public, another notification skips the expensive build. Missing/unreachable public markers cause a rebuild. Private API/authentication and provenance failures remain fatal. Publication markers do not replace Docs attestation or output validation.

Readiness is still mandatory: an unprepared or invalid snapshot fails explicitly. A Site-code main push can encounter preparation still in progress; the later successful Docs convergence automatically requests the ready release. Site never calls Ollama, LilysAI or target pages during build. The delivery job runs only after build and social URL/Docs revision verification succeed.

## One-time cross-repository connection

Docs `GITHUB_TOKEN` is limited to Docs. Keep existing private Docs read access in Site (`PRIVATES_GITHUB_PAT`). Add a separate fine-grained PAT, restricted to repository `ooMia/oomia.github.io` and **Actions: read and write**, as the Docs Actions secret **`SITE_PUBLISH_TOKEN`**. No Contents write permission is needed for `workflow_dispatch`. Account/token creation and secret entry are user-owned; never paste the value into chat or source.

After creating the restricted token, enter it interactively from the user's terminal:

```sh
gh secret set SITE_PUBLISH_TOKEN --repo ooMia/oomia.github.io.docs
```

Credential setup is not complete until Docs can actually request the main-only Site workflow. A Docs persistence success alone does not prove Site delivery; inspect the linked Publish Site run and public revision marker. A missing/denied token is an explicit failure of the request step, and committed Docs state remains recoverable.

## Recovery

Rerun Publish Docs on main to reuse prepared state and request deployment again. No-op convergence still supplies the ready SHA, so this does not force provider retries. Alternatively run Publish Site directly on main without a Docs input to resolve current main. An unchanged already-public pair skips. Explicit provider retries and semantic recovery remain separately authorized maintenance inputs.

Engine artifact maintenance periodically checks expiration and rebuilds only near expiry. Ordinary article publication downloads a verified artifact; it does not run the Engine development OS matrix. See [Engine operations](https://github.com/ooMia/oomia.github.io.engine#development).
