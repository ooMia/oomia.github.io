# Publishing Site

> **Authority:** REFERENCE\
> **Owner:** Site repository task and operation routing\
> **Scope:** `ooMia/oomia.github.io` development, content consumption, and delivery\
> **Read when:** finding the owning Site contract, implementation, or verification entry point\
> **Source of truth:** Site code/configuration and live GitHub state; shared policy owners routed by Knowledge CONTEXT

Astro-based presentation and delivery repository for the Publishing Platform.

The Site consumes canonical content from `ooMia/oomia.github.io.docs` through the submodule mounted at `apps/web/data/articles`. The Article collection is intentionally limited to `content/articles/**/*.{md,mdx}`; other canonical Docs content is not treated as an Article implicitly.

## Task routing

Read the owning source for the task; this README routes policy and operations rather than duplicating them.

Project context and shared policy start at [Knowledge CONTEXT](https://github.com/ooMia/oomia.github.io.knowledge/blob/main/CONTEXT.md). Follow its task routing, including `agent-conventions.md` for user/Agent interaction, approval, tool failure, capability fallback, and remote-state interpretation. The [Site Agent entry point](AGENTS.md) connects that shared routing to the local sources below.

| Task                                                  | Owning source / next reference                                                                                                                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content schema, metadata, publication, visibility     | [Content consumption contract](docs/content-consumption-contract.md) → `apps/web/src/lib/content` / `packages/md`                                                                                                             |
| Layout, theme, typography, TOC, homepage presentation | [Presentation foundation](docs/presentation-foundation.md) → `apps/web/src/components/presentation` / `packages/ui`                                                                                                           |
| Local development, check, unit test, typecheck, build | [Development](#development) → [root scripts](package.json), [web scripts](apps/web/package.json), [check/unit configuration](vite.config.ts)                                                                                  |
| Browser regression and rendered Evidence              | [Browser validation](#browser-validation) → [web scripts](apps/web/package.json), [Playwright config](apps/web/playwright.config.ts), [tests](apps/web/tests/)                                                                |
| Manual OS compatibility E2E                           | [OS compatibility workflow](.github/workflows/os-compatibility.yml) → `test:e2e:compat`                                                                                                                                       |
| Home navigation performance and unscored audits | [Lighthouse evidence and reproduction](docs/evidence/lighthouse-navigation/README.md) → `vp run --filter web test:lighthouse` |
| PR validation and Pages release/delivery              | [Site CI](.github/workflows/ci.yml), [Publish Site](.github/workflows/deploy.yaml), [publishing operations](docs/publishing.md)                                                                                               |
| Immutable Docs snapshot and preparation integrity     | [Consumption contract](docs/content-consumption-contract.md#article-social-metadata-and-derived-previews), `pnpm --filter web test:docs-snapshot`                                                                             |
| Issue admission / Development start                   | [Issue orchestration](.github/workflows/issue-activated.yml) → [shared admission][project-admission], [Development script](.github/scripts/create-development-branch.mjs), [policy](.github/scripts/orchestration-policy.mjs) |
| Native MDX LinkCard rendering and typography          | [Responsive density calibration](docs/evidence/link-card-density/README.md), [native rendering evidence](docs/evidence/mdx-link-card/README.md) → `vp run --filter web test:link-card`, `build:offline`                       |
| Markdown component investigation                      | [Revision-bound investigation evidence](docs/evidence/markdown-to-js/README.md) → [PR #59](https://github.com/ooMia/oomia.github.io/pull/59)                                                                                  |
| Revision-bound / historical Evidence                  | [Presentation snapshots](docs/evidence/c1-w4-presentation/README.md), [homepage snapshots](docs/evidence/c1-w4-homepage/README.md) → owning Issue/PR for later results                                                        |

[project-admission]: https://github.com/ooMia/oomia.github.io.knowledge/blob/0f21e830e86f60f24415e8f6a2a07faaa305c466/.github/workflows/project-admission.yml

Engine is optional and is not a Site runtime dependency. A canonical Docs revision is publishable only when the actual Site consumer accepts and builds it.

## Development

Initialize the canonical content submodule and install dependencies:

```sh
git submodule update --init --recursive
vp install --frozen-lockfile
vp exec --filter web -- playwright install chromium
```

Run the current consumer checks:

```sh
vp exec --filter web -- astro sync
vp check
vp test
vp run --filter web typecheck
vp run --filter @workspace/ui typecheck
vp run --filter web build
```

For local web development:

```sh
vp run --filter web dev
```

`dev` first resolves the public [publication marker](https://oomia.github.io/.well-known/oomia-publication.json) once, checks out that exact published Docs SHA, and runs the existing readiness checks and native content sync before starting Astro. The printed Docs SHA is the actual checkout; current Docs `main` can move independently. A missing/malformed/unreachable marker fails explicitly and never silently uses the old Site gitlink. This preparation may clone/fetch Docs but never runs a provider, produces derived content or stages/commits the Site gitlink. Dirty or untracked Docs changes stop preparation before network/checkout; preserve them first.

Preparation can also run separately. Select another source explicitly when needed:

```sh
vp run --filter web prepare:content                         # published, online
vp run --filter web prepare:content --source=current        # actual existing HEAD, no fetch/checkout
vp run --filter web prepare:content --source=pinned         # stored Site gitlink
vp run --filter web prepare:content --source=cached         # last validated published selection, offline
vp run --filter web dev --content-source=current --host 127.0.0.1 --port 4322
```

`current` and `cached` require a local checkout and never fetch; each still validates actual SHA, readiness and native content. `cached` uses ignored `apps/web/.cache/dev-content.json`, written only after successful published preparation. It explicitly represents a previously published selection, without claiming that it is still the live publication. `pinned` may fetch its fixed object when absent. All sources use the same immutable validation after selection. Normal Astro `dev` flags are forwarded; help/version do not require preparation. Direct `astro build/sync` retains its existing explicit checkout-mode contract, so after development preparation use the displayed SHA with `DOCS_CHECKOUT_MODE=resolved DOCS_CHECKOUT_REVISION=<sha>` or choose the appropriate direct mode. Site never commits this local checkout change.

Local environment values can override the public URL/base path when needed:

```sh
SITE_URL=http://localhost:4321
BASE_PATH=/
FILTER_DRAFT_ARTICLES=false
```

Copy `apps/web/.env.example` to `apps/web/.env` for local values. Astro config loads Vite's mode-specific `.env` files (`--mode` is supported); an external environment value takes precedence, including an explicitly empty value. `SITE_URL` takes precedence over the legacy `SITE` alias, and an empty URL retains the localhost default. URL/base normalization and Docs checkout inputs are owned by the pure typed `apps/web/src/config/environment.ts` boundary. Only HTTP(S) Site URLs without credentials are accepted.

`FILTER_DRAFT_ARTICLES` is a server-only `env.schema` field consumed through `astro:env/server`; only literal `true` enables filtering. Astro's built-in `BASE_URL` remains the browser navigation input. The one custom `ImportMetaEnv` declaration, `DOCS_REVISION`, is a string derived from actual validated Docs HEAD by config, rather than a caller-supplied environment value. `DOCS_CHECKOUT_MODE` accepts `pinned` (default), `main` (fetched CI snapshot) or `resolved` (requires the exact lowercase 40-character `DOCS_CHECKOUT_REVISION`). These Node configuration inputs are never read from `process.env` in application content modules. Provider identities, locales and other domain contracts remain code constants.

This boundary follows [Astro environment variables](https://docs.astro.build/en/guides/environment-variables/#in-the-astro-config-file) for config-time `loadEnv` and [typed server/client fields](https://docs.astro.build/en/guides/environment-variables/#type-safe-environment-variables). Add application settings to the schema and this input contract before consuming them; browser-exposed fields must explicitly use a client/public schema context.

`FILTER_DRAFT_ARTICLES=true` excludes `draft: true` entries from both article discovery and generated routes. It remains opt-in and is currently left disabled, so Pages continues to expose the canonical draft corpus.

Native Mermaid fences are rendered to SVG during content sync/build using local Chromium with browser network requests blocked. Install the matching Playwright browser before sync, typecheck or build; on Linux CI use `playwright install --with-deps chromium`. `PLAYWRIGHT_CHANNEL=chrome` can select installed Chrome locally. Reader pages do not load Mermaid. See the [rendering contract](docs/content-consumption-contract.md#native-code-tables-and-mermaid).

## Browser validation

Build the pinned corpus first, then run full local regression and optional rendered Evidence:

```sh
vp exec --filter web -- playwright install chromium
BASE_PATH=/ vp run --filter web build
vp run --filter web test:e2e
vp run --filter web test:e2e:evidence
```

`test:e2e` retains the full desktop/mobile suite, including exhaustive article parity, contact/email activation, Activity failures, TOC, themes and static reading. `test:presentation` remains an alias for existing callers. `PLAYWRIGHT_CHANNEL=chrome` selects an installed Chrome; otherwise use Playwright Chromium.

`test:e2e:compat` selects only Playwright `@compat` tests in both viewport projects: homepage hierarchy/containment, representative article navigation, theme continuity and one structural provider-failure case. OS is the workflow matrix axis; the mobile project emulates a viewport, not a mobile OS. This small subset runs in CI **only** through the separate `workflow_dispatch` OS compatibility workflow (Ubuntu/macOS/Windows). It is not an ordinary automatic PR/promotion check or required default gate. Run it locally with `vp run --filter web test:e2e:compat` when changing that profile.

The manual workflow keeps `profile=compat` as its default; select `profile=full` to run the existing `test:e2e` regression on the same OS matrix.

PR Promotion also runs `test:native-rendering`, a network-blocked native Markdown/MDX fixture covering static diagrams, original source copying, no-JavaScript reading, tables, theme and narrow widths. `test:built-site` checks the completed artifact's Article metadata, generated navigation, local assets and original/English route pairs before upload. It does not reinterpret authored prose links. The production and compatibility builds install Chromium before content sync. Full browser regression remains the separate manual profile above.

The config owns preview lifecycle on port 4321. Evidence capture starts/stops its own preview; run it after tests finish. Default output is ignored `test-results/homepage`; `PRESENTATION_EVIDENCE_DIR` selects another directory. Capture uses real providers and records the Git revision, viewport/theme, dimensions and dated provider observations. Run from a clean revision and record build settings, exact tested SHA, commands, PASS result, scope and limits in the PR. Also reference the commit that established the profile split.

Attach representative PNGs to the PR with GitHub's image upload UI or a capable CLI (`gh pr edit <number> --attach '<path>#<alt text>'`). Verify the live PR asset URLs before removing earlier repository snapshots; never fabricate attachment URLs. Historical snapshots are revision-bound, not the owner of current execution policy. Playwright reports/traces remain local under ignored output directories.

## Content and presentation

See [Content consumption contract](docs/content-consumption-contract.md) for the input/publishability boundary and [Site presentation foundation](docs/presentation-foundation.md) for the current layout, typography, theme and authoring-neutral presentation baseline.

Issue `opened`/`reopened` performs first Project #11 admission only. Manual Issue orchestration can replay admission idempotently or explicitly start Development; Development start requires a live Iteration commitment, creates or confirms the linked branch from `main`, and then materializes `In progress`. PRs targeting `main` run Promotion validation; PRs targeting `develop` run Develop validation in the separate Site CI workflow. Publish Site handles main pushes and main-only workflow dispatch from prepared Docs or an operator. See [publishing operations](docs/publishing.md) for automatic delivery, stale/duplicate handling and one-time authentication setup. These behaviors are owned by the live workflow/script, and a successful PR validation is not a deployment.

Articles use a shared Fumadocs HomeLayout/provider island, editorial ArticleFrame, DocsBody typography, a supporting desktop TOC rail and compact inline outline on smaller screens. Canonical `date / updatedDate / tags / aliases / draft / author` are adapted into one public ArticleMetadata model; reading time remains render-derived. PR validation (both `main` and `develop`) and manual OS compatibility validation check out the current Docs `main` HEAD with full history at the content mount, independently of the Site gitlink. Production Pages releases resolve the latest Docs `main` once at job start, check out that exact SHA with full history, and validate the Docs preparation attestation before building. An incomplete/mismatched snapshot fails readiness rather than changing revisions mid-release. Each job records the Site SHA, Docs SHA actually used and stored gitlink in its summary; production cache and every Article's `oomia:docs-revision` use the resolved actual SHA. CI never commits the runtime checkout back to Site; local submodule initialization continues to use the stored pin. The homepage reuses the same provider and article model for an editorial Hero, featured/recent articles, tag discovery, a single Profile contact area and subordinate Profile / Activity.

Optional KO/EN article consumption and native translation fixture: [Article translations](docs/article-translations.md), `vp exec --filter web -- node tests/translations/build.mjs`. English retains explicit Korean fallback until a validated Docs artifact exists; Site does not run an AI provider.
