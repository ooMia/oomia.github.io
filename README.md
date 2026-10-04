# Publishing Site

Astro-based presentation and delivery repository for the Publishing Platform.

The Site consumes canonical content from `ooMia/oomia.github.io.docs` through the submodule mounted at `apps/web/data/articles`. The Article collection is intentionally limited to `content/articles/**/*.{md,mdx}`; other canonical Docs content is not treated as an Article implicitly.

## Repository responsibilities

- `apps/web`: Astro consumer, routes and rendering
- `packages/md`: Markdown/MDX processing owned by this Site codebase
- `packages/ui`: shared Site UI components
- `docs/content-consumption-contract.md`: observable input, rendering and publishability boundary
- `docs/presentation-foundation.md`: layout, typography, theme and presentation baseline
- `.github/workflows/deploy.yaml`: build verification and GitHub Pages delivery

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

For browser verification against the built corpus:

```sh
vp exec --filter web -- playwright install chromium
vp run --filter web test:presentation
```

An installed Chrome can be used with `PLAYWRIGHT_CHANNEL=chrome`. Browser tests cover desktop/mobile TOC, theme persistence, Callout/LinkCard, static reading and the current corpus. See [rendered Evidence and known limits](docs/evidence/c1-w4-presentation/README.md).

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

## Content and presentation

See [Content consumption contract](docs/content-consumption-contract.md) for the input/publishability boundary and [Site presentation foundation](docs/presentation-foundation.md) for the current layout, typography, theme and authoring-neutral presentation baseline.

Issue `opened`/`reopened` performs first Project #11 admission only. Manual Issue orchestration can replay admission idempotently or explicitly start Development; Development start requires a live Iteration commitment, creates or confirms the linked branch from `main`, and then materializes `In progress`. PRs targeting `main` run Promotion validation; PRs targeting `develop` run the build job. Pages delivery runs only on `main` push or explicit workflow dispatch. These behaviors are owned by the live workflow/script, and a successful PR validation is not a deployment.

Articles use a shared Fumadocs HomeLayout/provider island, Site-owned ArticleFrame, DocsBody typography and a compact top TOC. Canonical `date / updatedDate / tags / aliases / draft / author` are adapted into one public ArticleMetadata model; reading time remains render-derived. CI keeps the parent Site checkout shallow and expands only the pinned Docs submodule history so Git can provide date fallbacks without moving the gitlink. Homepage discovery/visual design remains #37.
