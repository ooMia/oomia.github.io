# C1-W4 homepage Evidence

Historical snapshot of the pre-review implementation. Current execution policy is in [README Browser validation](../../../README.md#browser-validation); subsequent renders/results are recorded in [PR #55](https://github.com/ooMia/oomia.github.io/pull/55).

Captured 2026-10-05 (Asia/Seoul) against implementation revision [78d9e622](https://github.com/ooMia/oomia.github.io/commit/78d9e622cfef3f9e8b2ed228dca6248df1fd2b5a), with canonical Docs pinned at [feda09af](https://github.com/ooMia/oomia.github.io.docs/commit/feda09afb4343028be4c680fc5ba9dcf267b6366). Docs files and the submodule pointer are unchanged.

Owner: [Issue #37](https://github.com/ooMia/oomia.github.io/issues/37) / [PR #55](https://github.com/ooMia/oomia.github.io/pull/55).

## Rendered homepage

Actual browser-loaded provider images, without mocks:

| Viewport             | Light                              | Dark                              |
| -------------------- | ---------------------------------- | --------------------------------- |
| Desktop, 1440 × 1000 | [Full homepage](desktop-light.png) | [Full homepage](desktop-dark.png) |
| Mobile, 390 × 844    | [Full homepage](mobile-light.png)  | [Full homepage](mobile-dark.png)  |

The images show Hero → Recent Articles → Profile / Activity, all ten canonical articles, contact links, preserved tag casing and subordinate Activity visuals. All three remote images loaded during this capture. [Provider status](provider-status.json) records the observation and measured document width: 1440/1440 and 390/390 in both themes. This is a dated availability observation; the external providers can change independently. Provider images retain their supplied colors in both Site themes.

## Decision compliance

- [#35](https://github.com/ooMia/oomia.github.io/issues/35) / [presentation foundation](../../presentation-foundation.md): reuse the existing SiteFrame, HomeLayout and theme lifecycle. The page's width wrapper is a `div` because HomeLayout already supplies the main landmark. No new theme runtime/framework or global styles.
- [#36](https://github.com/ooMia/oomia.github.io/issues/36) / [consumption contract](../../content-consumption-contract.md): keep `getArticleRecords()`, ArticleMetadata, shared visibility/order, render-derived reading time and base-aware article URLs. No homepage-specific publication policy. Omit repeated author/updatedAt; preserve authored tags. No pagination.
- [#37](https://github.com/ooMia/oomia.github.io/issues/37): use the approved identity/copy/contacts. Remove the oversized Gravatar scaffold and its unused fetch/cache helper. Avatar is optional, so no replacement visual is required.
- Activity is one removable Astro component using ordinary lazy browser `<img>` elements with accessible alt text and persistent profile-link captions. No optimizer fetch, proxy, API, cache or provider data interpretation is added. Removing the component import/use leaves article discovery independent.
- [#46](https://github.com/ooMia/oomia.github.io/issues/46) remains independent; its LinkCard adapter and content pipeline are unchanged.
- Existing article optional date props now explicitly accept `undefined`, matching their Astro callers under `exactOptionalPropertyTypes`. The prior theme-navigation test now selects the Site navbar link rather than also matching the article author link. Neither changes publication behavior.

All product requirements were already in #37; no conversation-only product decision or durable contract change needed to be duplicated in Site docs. Small spacing, list dividers and responsive Activity grid choices use the existing theme tokens.

## Validation

- `vp check`: PASS, zero errors. Two existing warnings originate in pinned Docs scripts (`require-array-sort-compare`); those sources are unchanged.
- `vp test`: PASS, 8 files / 38 unit tests, including shared metadata, publication ordering/visibility and LinkCard boundaries.
- Web Astro check: zero errors/warnings/hints. Shared UI typecheck: PASS.
- Production build: PASS, homepage + 10 canonical article routes, 14 local optimized images.
- Chrome Playwright: PASS, 24 desktop/mobile tests. New coverage checks hierarchy/contacts, email keyboard activation, theme/reload, every listing's metadata against its article page, rendered ordering and each provider's failure in isolation. Oversized 1400px SVG fixtures stress responsive containment; they do not establish provider availability.
- Existing browser coverage still passes for TOC, theme persistence/system preference, Callout/LinkCard, base-aware article links, full corpus images/overflow and article reading without JavaScript.
- Entire final diff inspected; no package/lockfile, shared article helper, canonical Docs or workflow change.

Reproduce from the repository root (dependencies and pinned full-history Docs initialized):

```sh
vp exec --filter web -- astro sync
vp check
vp test
vp run --filter web typecheck
vp run --filter @workspace/ui typecheck
BASE_PATH=/ vp run --filter web build
PLAYWRIGHT_CHANNEL=chrome vp run --filter web test:presentation
PLAYWRIGHT_CHANNEL=chrome vp exec --filter web -- node tests/homepage-render.mjs
```

The render script starts/stops its own preview server on port 4321. Run it after the browser suite finishes. `PRESENTATION_EVIDENCE_DIR` can select a separate output directory. The committed screenshots are snapshots; regeneration may show changed provider data.

## Integration limits

These are local Chrome render/test/build results. Safari/Firefox and activation of an external mail application are not claimed. The canonical M4A-as-image placeholder remains the documented pre-existing unsupported source asset. Remote CI results belong in PR #55 at its exact head. PR validation does not establish merge or Pages delivery; production release remains a separate explicit main workflow dispatch.
