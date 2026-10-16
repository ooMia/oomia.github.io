# Site presentation foundation

> **Authority:** POLICY\
> **Owner:** Site layout, typography, theme, navigation and Article presentation\
> **Scope:** `ooMia/oomia.github.io` presentation runtime\
> **Enforced by:** Site composition, native renderer, tests and browser validation

이 문서는 Site의 현재 presentation baseline을 소유한다. 시안 07의 채택과 실제 구현을 반영하여 이전 C1-W4의 compact-top-only TOC/neutral palette baseline을 발전시켰다. 세션별 시안이나 historical Evidence를 current code의 대체 원본으로 취급하지 않는다.

## Principles and ownership

- **Writing/blog first:** 본문과 글 탐색을 우선한다. Fumadocs documentation page tree와 path-derived taxonomy를 콘텐츠에 강제하지 않는다.
- **Native Markdown first:** `.md`는 native Sätteri, `.mdx`는 native MDX 및 기존 semantic enhancements를 유지한다. 디자인 때문에 문서를 변환하거나 두 번째 runtime compiler/evaluation 경로를 추가하지 않는다.
- **Canonical identity:** Docs source와 Astro entry ID가 원본이다. metadata, headings, reading time, 대표 이미지와 locale route를 구분한다. 원문과 번역을 별개 글로 집계하지 않는다.
- **Public extension points:** Fumadocs provider, HomeLayout header slot, DocsBody, Core TOC를 실제로 사용한다. 별도 theme lifecycle/heading observer를 복제하지 않는다.
- **Local presentation:** Site의 editorial 조판·배치·native pre/table adapter는 owning presentation component가 소유한다. Callout/LinkCard는 기존 component boundary와 source semantics를 유지한다.

| Concern | Owner |
| --- | --- |
| canonical article / persisted producer outputs | Docs |
| AI translation production | Engine / Docs workflow; this Site slice does not run it |
| native parsing / integrity token comparison | `@workspace/md` and existing Astro integration |
| discovery, publishability, translation verification | Site content collection / `lib/content` |
| routes, social metadata and Docs revision | Astro pages and existing metadata projection |
| theme / locale context and shell | Fumadocs Astro RootProvider + HomeLayout |
| active heading | Fumadocs Core AnchorProvider / TOCItem / useActiveAnchor |
| reading progress, tags, artwork and editorial layout | Site presentation components |

## Runtime composition

```text
canonical Docs → Astro collections → native processors → Astro render
                                                    → SiteFrame
                                                      ├─ HomeLayout header
                                                      ├─ HomeFrame / ArticleFrame
                                                      │   └─ AnchorProvider + DocsBody + ArticleTOC
                                                      └─ SiteFooter
```

Provider and page presentation share one React island. Astro-rendered Article content and Profile/Activity remain static children. Fumadocs owns theme persistence/system preference; theme hotkey is disabled. The header calls its public `useTheme().setTheme` directly so persistence happens in the click handler before immediate navigation; it does not defer the write inside a view transition. RootProvider receives explicit KO/EN locale context and BASE_PATH-aware navigation. Site does not introduce a second localStorage theme or MutationObserver controller.

## Home and navigation

Home uses the accepted Ideas into / systems typography, featured most-recent article, remaining visible articles, independent Profile and subordinate Profile/Activity. Metadata and reading time come from actual records/render results. Lab-only settings, iframe comparison, image editing, invented reading summaries and excerpt specimens are excluded.

The navbar aligns with the Home shell and provides brand→home, notes, profile, locale and maintained theme controls. Profile is the single contact area: GitHub, LinkedIn and email icon links have accessible names. Activity retains its provider/fallback behavior. Gravatar uses its official URL in a native lazy iframe with a deliberate 336×402 viewport; the complete card scales to narrow widths. Provider-reported oEmbed geometry is not a layout input. Build neither contacts Gravatar nor stores a provider metadata cache. Provider image/CSS optimization and response cache headers remain provider-owned.

Representative images are primary Article links. The featured Home image loads eagerly with high fetch priority and reserves its 400:260 composition; list images and the faint, angled, masked Article header decoration remain lazy. Decoration alone is clipped and hidden from accessibility; tag menus remain outside that clip. Selected artwork is explicitly configured by stable Article ID in `lib/presentation/articles.ts`, never assigned by listing position or inferred from a social-preview screenshot. Existing selected SVGs live in `public/images/article-covers`. New articles use a metadata-keyword fallback; template/image choices can be changed in the owning presentation configuration without new Markdown syntax.

## Tags and responsive cards

Tag identity is NFKC + trim + uppercase in a separate presentation index. Counts use distinct original Article IDs, sort descending, and use English alphabetic ties. This does not rewrite authored tags or social metadata. The picker displays `(n)`; per-article tags use that global ordering without counts.

Home query `?tag=...` is reloadable/shareable and survives history state. Tags remain anchors to the current locale Home, preserving navigation without hydration. The picker supports Arrow keys, Home/End, Escape and focus return. Each card fits tags into one lane and exposes the remainder in a separate keyboard-accessible list.

At 390px and 320px images precede metadata, retain 400:260 composition, and never crop meaningful image text. Titles remain complete, descriptions use two lines, metadata is concise, and tag rows keep compact spacing. Card height follows real text rather than a fixed height. Tablet/desktop place image and text side by side. Gutter and typography adjust at actual breakpoints.

## Article reading layout and typography

ArticleFrame renders the full canonical body, actual metadata, author/dates, normalized tag navigation and its configured image. Optional translation notices distinguish translated content from Korean fallback. It does not synthesize a reading summary from a prototype-only paragraph.

Desktop ≥1100px uses a 760px reading column and a 210px supporting TOC rail. Smaller screens use an inline native details/summary outline. This is Article reading support, not a documentation/category sidebar. Heading depth comes from native render results. Core alone selects active headings; Site moves a small marker and colors from that state.

DocsBody keeps the maintained prose primitive. Site-owned `article.css` applies Gowun Batang + Literata, 0.015em Latin tracking, native paragraph justification and first-line indentation, bounded line length and responsive font size. Metadata/header and Home use Noto Sans KR; Hero uses the actual Space Grotesk typeface with Georgia italic. Code remains monospace and visually distinct. Quotes/tables retain their semantic structures and appropriate local sans treatment.

Native Astro pre/code highlighting remains unchanged. A hydration adapter adds code actions and scroll surfaces around native elements, preserving code text/line structure. It wraps tables for keyboard-accessible scrolling and adds Latin-only presentation spans without changing text. Cleanup is idempotent; no JavaScript still shows native code, tables, Article links and outline.

Reading progress measures the rendered full Article body, excludes header/footer, reaches 100% when the body bottom is visible, and exposes min/max/current values. It does not claim comprehension. Scroll/progress/current-heading transitions are short and interruptible. `prefers-reduced-motion` removes smooth movement while retaining information, anchors and focus behavior.

## Shared visual roles

Sage palette values map to the existing shadcn/Fumadocs tokens, including `--muted` surface and `--muted-foreground` text. `--paper`, `--surface`, `--ink`, `--line` and other local aliases derive from that one palette. Light/dark roles preserve readable contrast. Fontsource font assets are self-hosted with license notices; prototype content-specific font subsets are not used for production text.

Astro's Fonts API owns the Home display and Article prose declarations, copied assets and metric-adjusted fallbacks. Its local provider reads pinned Fontsource packages and the existing Space Grotesk asset; sync/build does not contact a font CDN. Noto Sans KR uses the maintained Fontsource stylesheet so its large Unicode declarations remain in cacheable CSS rather than enlarging every HTML document. Noto Sans KR uses the same upstream v40 typeface as a variable font, so a Unicode range used at multiple weights is transferred once. All Fontsource Unicode ranges remain available; content-specific subsetting is not used.

RootLayout registers Noto Sans KR without preloading its entire Korean character set. Home alone registers and preloads the critical Space Grotesk Hero face. Both Article routes register Gowun Batang 400/700 and normal/italic Literata without preloading their full sets. Literata has no generic fallback inside its generated variable, allowing Korean text to reach Gowun Batang. CSS uses the generated variables, retaining the established typefaces and their license notices. Home must not inherit prose declarations through the shared renderer. Performance claims require the controlled Lighthouse comparison, separate from these build checks.

Static pages use Astro's hash-based meta CSP. Site's finalizer adds only the explicitly marked Fumadocs theme bootstrap hash to Astro's generated policy; same-origin module scripts remain allowed for Astro's loader compatibility, while unapproved inline scripts, inline event handlers and eval are blocked. Style attributes remain allowed for native Shiki and React presentation, and next-themes' transition stylesheet has an explicit hash. GitHub Pages response-header controls, including HSTS refinements, COOP, frame-ancestor restrictions and the Trusted Types header audit, remain outside this meta-policy's guarantees.

Root scrollbars follow page background. TOC/tag/table/code scroll surfaces declare their own opaque background token. Native code blocks keep their Shiki surface and independent thumb colors. A new painted scrolling component should declare its surface rather than guessing rendered alpha backgrounds.

## KO / EN

Korean retains existing URLs. English uses `/en/` with BASE_PATH-aware helpers, document/section language and explicit original links. Fumadocs context translates UI, while validated optional Docs artifacts supply actual translated prose. Missing artifacts show Korean fallback clearly and do not claim AI translation; fallback Article URLs canonicalize to the original and are noindex. Valid translated counterparts use language-specific social metadata and reciprocal alternate links. See [translation consumption](article-translations.md).

## Verification and delivery

Current commands and profiles are owned by [README Browser validation](../README.md#browser-validation), package scripts and test configuration. Unit/type checks, immutable network-blocked Docs fixture, native translation fixture, full corpus build, and responsive runtime checks are separate evidence. CI, merge, Pages deployment and public audit remain separate claims.

The integration updates existing behavior tests for the new composition rather than preserving obsolete heading names or exact DOM child structure. Contact activation, provider failure, canonical metadata parity, code preservation, theme/locale continuity, TOC keyboard/no-JS behavior and non-root base navigation remain verification targets.

Earlier [C1-W4 evidence](evidence/c1-w4-presentation/README.md) and [homepage evidence](evidence/c1-w4-homepage/README.md) are historical revision-bound snapshots. New evidence is linked from the implementation Issue/PR. Home interactive Hero exploration remains separate in [#75](https://github.com/ooMia/oomia.github.io/issues/75).

## Revisit boundary

Update this baseline with the implementing PR when introducing documentation page trees, moving source ownership, requiring Site-specific MDX syntax, replacing the theme/Core TOC owner, or changing native rendering/production boundaries. Palette, spacing, icon and breakpoint tuning remain reversible implementation choices with appropriate rendered verification.

## References

- [Fumadocs Astro](https://www.fumadocs.dev/docs/manual-installation/astro), [Headless TOC](https://www.fumadocs.dev/docs/headless/components/toc), [Theme](https://www.fumadocs.dev/docs/ui/theme)
- [Astro content collections](https://docs.astro.build/en/guides/content-collections/), [React integration](https://docs.astro.build/en/guides/integrations-guide/react/)
- [Astro Fonts](https://docs.astro.build/en/guides/fonts/), [local font provider](https://docs.astro.build/en/reference/font-provider-reference/#local)
- [Fontsource Gowun Batang](https://fontsource.org/fonts/gowun-batang), [Literata](https://fontsource.org/fonts/literata)
