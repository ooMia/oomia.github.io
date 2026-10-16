# Article quality evidence

CSS comparison uses the real ArticleFrame and LinkCard in a Site-local fixture. `tests/link-card/quality.mjs` compares cover/fixed 16:9, uncapped intrinsic ratio, and capped contain at 320/390/768/1440px in light/dark. External requests are blocked; landscape (1200×630), portrait (630×1200) and text-heavy square (1000×1000) images are deterministic intercepted SVGs.

At 760px reading width the portrait card is 1,556px tall without a cap, versus 397px with capped contain. Contain preserves all four image edges and the top/bottom text; cover loses meaningful content. Portrait text is smaller under the cap, an explicit tradeoff for compact previews. Text-only and authored fallback links retain their behavior. Existing navigation/summary regression remains a separate check.

Inline-code comparison uses `Stream<? extends Arguments> provideArguments(ExtensionContext context)` inside Korean prose. Inline-block moves the whole code expression to a separate line and amplifies justification spaces on the previous line. Start alignment only on code-containing paragraphs preserves natural wrapping and stable internal spaces. Other prose remains justified. No string-processing JavaScript is introduced.

Reproduce:

```sh
pnpm --filter web exec node tests/link-card/build.mjs --fixture
pnpm --filter web exec node tests/link-card/quality.mjs
```

Set `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome. Screenshots and machine-readable observations are written to ignored `apps/web/test-results/article-quality/`. These measurements concern deterministic layout, not live external image availability or production delivery. Exact tested revisions and remaining verification are recorded in the implementing PR.

## Native rendering and source preservation

`pnpm --filter web test:native-rendering` builds the same native Markdown/MDX fixture with browser and Node network requests blocked. It checks both grammars, including MDX JSX containers, code/table semantics, headings and reading time, exact source clipboard roundtrips, clipboard-denied source selection, and reading without JavaScript. The 320/390/768/1440px × light/dark matrix checks both SVG variants, intrinsic dimensions, aspect ratio and containment. Screenshots and results live under ignored `apps/web/native-rendering-evidence/`.

Code source regression includes authored trailing blank lines, duplicate blocks with different trailing whitespace, raw HTML, nesting, empty blocks and reordered GFM footnotes. Native highlighting remains unchanged. Source follows its parser node through the public Markdown extension points; it is not matched by document order. Invalid Mermaid fails with a source filename and parse diagnostic. SVG boundary tests reject active content and external resources. No Mermaid library is included in reader bundles.

## Cost and scope

Comparison uses Site main `59053911536aaf23fb931ea2f8038bcd0b2a4ce4` and the implementing PR, both consuming unmodified Docs `472035a98bb0d6c4b115e70772185f1ee77df0b5`. Locally installed Chrome renders the diagrams; no browser download or cold CI setup cost is included.

| Observation                                         |   Main | Implementing PR |
| --------------------------------------------------- | -----: | --------------: |
| All emitted JavaScript files, raw bytes             | 779843 |          778234 |
| Sum of individually gzipped JavaScript files, bytes | 253895 |          253315 |
| Utility Article body elements without JavaScript    |    397 |             430 |
| Utility Article body elements after hydration       |    444 |             430 |
| Utility Article Latin-only spans after hydration    |     32 |               0 |

This is an artifact/DOM comparison, not a transfer, hydration-time, LCP or INP benchmark. The small JavaScript reduction does not justify a broader provider/island rewrite. Static toolbars add initial elements but remove structural hydration work. Light/dark SVG data images increase the Mermaid Article's uncompressed HTML from roughly 25KB to 88KB; that cost replaces runtime diagram rendering. Build timings depend on content/image caches and are not a controlled performance comparison.

## Delivery and existing limitations

The completed artifact check validates generated navigation, local assets (including Astro island entry points and social images), original/English route pairs, canonical/social URLs and Docs revision markers. It runs before production artifact upload. Native authored prose links retain their existing grammar and are not reinterpreted by that check. Missing image URLs are reported explicitly.

Read-only production audit at main `5905391` found Home and all 11 original Article URLs returning HTTP 200, with consistent Docs revision markers. Chrome observed no page errors or failed requests. CUA-only MutationObserver errors did not reproduce in independent Chrome and are not established as a Site defect. This is existing production evidence; the implementing PR has not thereby been deployed.

Existing limits outside this presentation change:

- The Docs `enrich-docs` Windows runner was offline. The most recent preparation run was cancelled after 24 hours without assigned runner steps. Current content still matches its accepted readiness attestation; preparation of a new content revision needs separate operational verification after runner recovery.
- `vscode-invalid-wsl-distribution.md` authors `record.m4a` as an image. Native output contains an unresolved image placeholder, already recognized by the existing corpus E2E. The static check reports this missing-URL case; it does not claim the recording is playable.
- `TDD-dev-flow.md` contains `[[init-project]]`, which renders to an unresolved authored relative link. This PR preserves source/grammar and does not repair canonical Docs authoring.
- Draft filtering remains opt-in; the publishing policy is unchanged. Missing optional translation artifacts still produce the existing collection warnings and explicit Korean fallback pages.
