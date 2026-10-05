# Publishing Site

Astro-based presentation and delivery repository for the Publishing Platform.

The Site consumes canonical content from `ooMia/oomia.github.io.docs` through the submodule mounted at `apps/web/data/articles`. The Article collection is intentionally limited to `content/articles/**/*.{md,mdx}`; other canonical Docs content is not treated as an Article implicitly.

## Task routing

Read the owning source for the task; this README routes policy and operations rather than duplicating them.

| Task                                                  | Owning source / next reference                                                                                                                                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content schema, metadata, publication, visibility     | [Content consumption contract](docs/content-consumption-contract.md) → `apps/web/src/lib/content` / `packages/md`                                                                                                                            |
| Layout, theme, typography, TOC, homepage presentation | [Presentation foundation](docs/presentation-foundation.md) → `apps/web/src/components/presentation` / `packages/ui`                                                                                                                          |
| Local development, check, unit test, typecheck, build | [Development](#development) → [root scripts](package.json), [web scripts](apps/web/package.json), [check/unit configuration](vite.config.ts)                                                                                                 |
| Browser regression and rendered Evidence              | [Browser validation](#browser-validation) → [web scripts](apps/web/package.json), [Playwright config](apps/web/playwright.config.ts), [tests](apps/web/tests/)                                                                               |
| Manual OS compatibility E2E                           | [OS compatibility workflow](.github/workflows/os-compatibility.yml) → `test:e2e:compat`                                                                                                                                                      |
| PR validation and Pages release/delivery              | [Deploy workflow](.github/workflows/deploy.yaml)                                                                                                                                                                                             |
| Issue admission / Development start                   | [Issue orchestration](.github/workflows/issue-activated.yml) → [shared admission][project-admission], [Development script](.github/scripts/create-development-branch.mjs), [policy](.github/scripts/orchestration-policy.mjs) |
| Revision-bound / historical Evidence                  | [Presentation snapshots](docs/evidence/c1-w4-presentation/README.md), [homepage snapshots](docs/evidence/c1-w4-homepage/README.md) → owning Issue/PR for later results                                                                       |

[project-admission]: https://github.com/ooMia/oomia.github.io.knowledge/blob/0f21e830e86f60f24415e8f6a2a07faaa305c466/.github/workflows/project-admission.yml

Engine is optional and is not a Site runtime dependency. A canonical Docs revision is publishable only when the actual Site consumer accepts and builds it.

## Development

Initialize the canonical content submodule and install dependencies:

```sh
git submodule update --init --recursive
vp install --frozen-lockfile
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

Local environment values can override the public URL/base path when needed:

```sh
SITE_URL=http://localhost:4321
BASE_PATH=/
FILTER_DRAFT_ARTICLES=false
```

`FILTER_DRAFT_ARTICLES=true` excludes `draft: true` entries from both article discovery and generated routes. It remains opt-in and is currently left disabled, so Pages continues to expose the canonical draft corpus.

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

The config owns preview lifecycle on port 4321. Evidence capture starts/stops its own preview; run it after tests finish. Default output is ignored `test-results/homepage`; `PRESENTATION_EVIDENCE_DIR` selects another directory. Capture uses real providers and records the Git revision, viewport/theme, dimensions and dated provider observations. Run from a clean revision and record build settings, exact tested SHA, commands, PASS result, scope and limits in the PR. Also reference the commit that established the profile split.

Attach representative PNGs to the PR with GitHub's image upload UI or a capable CLI (`gh pr edit <number> --attach '<path>#<alt text>'`). Verify the live PR asset URLs before removing earlier repository snapshots; never fabricate attachment URLs. Historical snapshots are revision-bound, not the owner of current execution policy. Playwright reports/traces remain local under ignored output directories.

## Content and presentation

See [Content consumption contract](docs/content-consumption-contract.md) for the input/publishability boundary and [Site presentation foundation](docs/presentation-foundation.md) for the current layout, typography, theme and authoring-neutral presentation baseline.

Issue `opened`/`reopened` performs first Project #11 admission only. Manual Issue orchestration can replay admission idempotently or explicitly start Development; Development start requires a live Iteration commitment, creates or confirms the linked branch from `main`, and then materializes `In progress`. PRs targeting `main` run Promotion validation; PRs targeting `develop` run the build job. Pages delivery runs only on explicit workflow dispatch on `main`. These behaviors are owned by the live workflow/script, and a successful PR validation is not a deployment.

Articles use a shared Fumadocs HomeLayout/provider island, Site-owned ArticleFrame, DocsBody typography and a compact top TOC. Canonical `date / updatedDate / tags / aliases / draft / author` are adapted into one public ArticleMetadata model; reading time remains render-derived. CI keeps the parent Site checkout shallow and expands only the pinned Docs submodule history so Git can provide date fallbacks without moving the gitlink. The homepage reuses the same SiteFrame and article model for a compact personal Hero, Recent Articles and an independent Profile / Activity component.
