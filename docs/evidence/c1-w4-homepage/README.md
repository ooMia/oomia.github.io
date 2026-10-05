# C1-W4 homepage historical Evidence

Owner: [Issue #37](https://github.com/ooMia/oomia.github.io/issues/37) / [PR #55](https://github.com/ooMia/oomia.github.io/pull/55). Current browser execution policy and reproduction commands are routed through [README Browser validation](../../../README.md#browser-validation), package scripts and Playwright config.

## Original snapshot — 2026-10-05

The original implementation was captured at [78d9e622](https://github.com/ooMia/oomia.github.io/commit/78d9e622cfef3f9e8b2ed228dca6248df1fd2b5a), with Docs pinned at [feda09af](https://github.com/ooMia/oomia.github.io.docs/commit/feda09afb4343028be4c680fc5ba9dcf267b6366). [e1a06a72](https://github.com/ooMia/oomia.github.io/commit/e1a06a72a5f9f7e36e9a560f7cafaa86aeda3d35) added only Evidence files.

These pre-review renders remain available through immutable history:

| Viewport             | Light                                                                                                                                             | Dark                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Desktop, 1440 × 1000 | [Homepage](https://github.com/ooMia/oomia.github.io/blob/e1a06a72a5f9f7e36e9a560f7cafaa86aeda3d35/docs/evidence/c1-w4-homepage/desktop-light.png) | [Homepage](https://github.com/ooMia/oomia.github.io/blob/e1a06a72a5f9f7e36e9a560f7cafaa86aeda3d35/docs/evidence/c1-w4-homepage/desktop-dark.png) |
| Mobile, 390 × 844    | [Homepage](https://github.com/ooMia/oomia.github.io/blob/e1a06a72a5f9f7e36e9a560f7cafaa86aeda3d35/docs/evidence/c1-w4-homepage/mobile-light.png)  | [Homepage](https://github.com/ooMia/oomia.github.io/blob/e1a06a72a5f9f7e36e9a560f7cafaa86aeda3d35/docs/evidence/c1-w4-homepage/mobile-dark.png)  |

[Original provider observations](https://github.com/ooMia/oomia.github.io/blob/e1a06a72a5f9f7e36e9a560f7cafaa86aeda3d35/docs/evidence/c1-w4-homepage/provider-status.json) recorded three successful real-image loads and document width equal to viewport width in both themes. Original validation passed 38 unit tests and 24 Chrome desktop/mobile browser tests. The original failure test established discovery isolation but did not establish graceful visual fallback; the later review and strengthened tests address that gap.

## Post-implementation review

[Issue #37](https://github.com/ooMia/oomia.github.io/issues/37) records the decision rationale. [PR #55](https://github.com/ooMia/oomia.github.io/pull/55) owns subsequent exact revisions, local full-suite results, E2E policy baseline, rendered PR image attachments, automatic validation and limits. The replacement four-image attachment was verified on the live PR before the obsolete homepage binaries/provider snapshot were removed from the working branch. Immutable history above preserves the original Evidence.

The homepage still consumes the [presentation foundation](../../presentation-foundation.md) and [content consumption contract](../../content-consumption-contract.md). Activity remains removable external presentation; provider images intentionally retain supplied colors independently of Site theme. Local Chrome Evidence does not establish cross-OS compatibility, merge or Pages delivery.
