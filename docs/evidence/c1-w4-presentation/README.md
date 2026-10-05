# C1-W4 presentation Evidence

Historical revision-bound snapshot. Current browser execution policy is routed through [README Browser validation](../../../README.md#browser-validation).

Validation date: 2026-10-04 (Asia/Seoul). This is a revision-bound validation snapshot, not a session handoff or current-state ledger.

## Revisions and scope

- Runtime/test revision: [`10b6bd0970f22a5248ad28ddccec2ecdc0ab147f`](https://github.com/ooMia/oomia.github.io/commit/10b6bd0970f22a5248ad28ddccec2ecdc0ab147f).
- Implementation/review: [Site PR #39](https://github.com/ooMia/oomia.github.io/pull/39), based on `main@79efd753bd4b6efd63ab2e3bfccbd83935517c58`.
- Reviewed design baseline: [PR #38](https://github.com/ooMia/oomia.github.io/pull/38), with formatting repaired at `7e52b6c707bd28561346c1738c0b6cdd2dd6f570`. Its [Promotion validation](https://github.com/ooMia/oomia.github.io/actions/runs/37133454941) succeeded. This validates that documentation change, not the runtime delta in #39.
- Unchanged canonical Docs revision: [`c1cb0f1c7c435cfe7b2fd24173f33b54847f75c2`](https://github.com/ooMia/oomia.github.io.docs/commit/c1cb0f1c7c435cfe7b2fd24173f33b54847f75c2).
- Fumadocs UI/Core: `16.15.18`; browser tests: Playwright `1.63.0`, local installed Chrome on macOS.

## Observed results

| Check               | Actual result                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Astro sync          | Full canonical collection accepted                                                                          |
| `vp check`          | No errors; one existing canonical Docs enrichment-script sort warning                                       |
| `vp test`           | 14 Markdown/reading-time/LinkCard tests passed                                                              |
| web Astro typecheck | 0 errors, 0 warnings, 0 hints                                                                               |
| shared UI typecheck | Passed                                                                                                      |
| Production build    | 10 article routes + homepage, 14 optimized images                                                           |
| Browser regressions | 12 passed, desktop 1440×1000 and mobile 390×844                                                             |
| TOC                 | Native outline, heading jump, single active anchor, manual-scroll tracking, sticky placement, Enter/Escape  |
| Theme               | Light/dark, saved preference, system default, reload, homepage navigation, disabled `D` hotkey              |
| Rendering           | `post.data` title/description, render-derived reading time, 768px article shell, full viewport body         |
| Corpus              | All built articles hydrate without page errors or horizontal document overflow; supported local images load |
| Components          | Registered info Callout and local metadata-backed LinkCard retained                                         |
| Static reading      | Body and native TOC/anchor navigation work without JavaScript                                               |

The homepage retains its previous scaffold content; #37 owns discovery redesign. #36 still owns date/tags/author presentation, deterministic ordering and production draft visibility. All 10 current draft articles continue to build in production; no draft filtering is claimed here.

## Representative rendered results

Representative source: `content/articles/tech/log/woowa-precourse-utility.mdx`; local production route `/articles/tech/log/woowa-precourse-utility/`.

| State           | Desktop                               | Mobile                               |
| --------------- | ------------------------------------- | ------------------------------------ |
| Light           | [render](desktop-light.png)           | [render](mobile-light.png)           |
| Dark            | [render](desktop-dark.png)            | [render](mobile-dark.png)            |
| Callout, light  | [render](desktop-callout-light.png)   | [render](mobile-callout-light.png)   |
| Callout, dark   | [render](desktop-callout-dark.png)    | [render](mobile-callout-dark.png)    |
| LinkCard, light | [render](desktop-link-card-light.png) | [render](mobile-link-card-light.png) |
| LinkCard, dark  | [render](desktop-link-card-dark.png)  | [render](mobile-link-card-dark.png)  |

Callout route: `/articles/tech/log/woowa-precourse-parameterized-test/`. LinkCard route: `/articles/tech/log/tdd-dev-flow/`.

The screenshots were generated from the local production preview and visually inspected. They do not establish Pages delivery.

## Composition/theme decision

`SiteFrame` combines Astro RootProvider and HomeLayout in one React island. A public header slot keeps theme/GitHub controls visible without a mobile menu. `ArticleFrame` owns width and header, `DocsBody` owns general document typography, and Fumadocs Core owns active-anchor observation. Site's `ArticleTOC` owns only the compact native outline UI. Search, Source/page tree, OG generation and Fumadocs MDX are not introduced.

The selected shadcn preset shares the existing neutral token set with `packages/ui`, keeping a single color owner. A temporary `shadcn.css` → `neutral.css` import substitution rendered the same article with Fumadocs-native tokens: [light comparison](comparison-neutral-light.png), [dark comparison](comparison-neutral-dark.png). Both are readable; the native path adds a second token vocabulary alongside the shared UI. The final runtime restores `shadcn.css`. Exact colors remain replaceable.

Two small compatibility boundaries remain local: `article.css` adapts native Astro highlighted pre/code markup to DocsBody, and Callout owns its light/dark tone colors. No Fumadocs internal DOM selector overrides are added.

## Reproduction

From the repository root:

```sh
git submodule update --init --recursive
vp install --frozen-lockfile
vp exec --filter web -- astro sync
vp check
vp test
vp run --filter web typecheck
vp run --filter @workspace/ui typecheck
vp run --filter web build
vp exec --filter web -- playwright install chromium
vp run --filter web test:presentation
```

Use `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome. `PRESENTATION_EVIDENCE_DIR=/absolute/output/path` saves screenshots. `PRESENTATION_BASE=/prefix` runs browser routes against a matching `BASE_PATH` build/preview. Browser outputs are ignored and excluded from Astro typechecking. The test-only `preview.mjs` uses Astro’s documented programmatic preview API so the server stays in Playwright’s process tree even when the Astro CLI detects an Agent and defaults to background execution.

## Known limits

- The canonical troubleshooting article already writes `record.m4a` with image syntax. Astro emits an unresolved image placeholder with no `src`; no audio renderer or Markdown transform is added in #35. The browser corpus check explicitly accounts for that one placeholder and checks all other images. Build acceptance does not imply that this media renders correctly.
- The existing homepage Gravatar card uses build-time network retrieval (and a local derived cache). Initial full build was run with network access; this change does not claim an entirely offline Site build.
- Local Chrome at two viewport sizes is the browser evidence here; Safari/Firefox and a deployed Pages result are not inferred.
- Issue closure/Project Done requires owning changes to be integrated and actual remote checks to be verified. An open implementation PR remains work in progress.

## Official API references checked for this implementation

- [Astro + React island integration](https://www.fumadocs.dev/docs/manual-installation/astro)
- [HomeLayout](https://www.fumadocs.dev/docs/ui/layouts/home-layout) and [RootProvider](https://www.fumadocs.dev/docs/ui/layouts/root-provider)
- [DocsBody](https://www.fumadocs.dev/docs/ui/layouts/page)
- [Fumadocs themes/shadcn preset](https://www.fumadocs.dev/docs/ui/theme)
- [Headless TOC observer](https://www.fumadocs.dev/docs/headless/components/toc)
- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro programmatic preview API](https://docs.astro.build/en/reference/programmatic-reference/)
