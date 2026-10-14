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
