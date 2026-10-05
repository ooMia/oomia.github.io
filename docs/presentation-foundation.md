# Site presentation foundation

이 문서는 Site의 layout, typography, theme, navigation, article presentation에 대한 **현재 canonical baseline**을 소유한다.

구현 세부를 영구 고정하는 문서가 아니다. 더 유지하기 쉽고 읽기 좋은 선택이 실제 구현·검증으로 확인되면 baseline과 근거를 함께 갱신한다. 외부 라이브러리의 현재 동작은 아래 References의 공식 문서를 기준으로 구현 시 다시 확인한다.

## Goals

현재 C1-W4의 presentation 목표는 다음과 같다.

> canonical Docs의 실제 article을 기존 Astro content pipeline으로 소비하면서, Writing/blog 중심의 일관되고 유지 가능한 reading experience를 제공한다.

이 목표를 위해 Site는 documentation framework의 정보 구조를 canonical content에 강제하지 않는다. Fumadocs는 우선 UI/presentation capability로 사용하고, canonical source는 Obsidian 같은 일반 Markdown editor에서도 이해 가능한 형태를 유지한다.

## Principles

### Writing/blog first

article은 API reference나 계층형 documentation보다 읽기 경험을 우선한다.

- article body가 화면의 주인공이다.
- permanent sidebar는 기본값이 아니다.
- navigation은 실제 corpus가 요구하는 만큼만 추가한다.
- document path를 자동으로 사용자-facing taxonomy나 breadcrumb로 승격하지 않는다.

### Native Markdown first

canonical authoring syntax의 우선순위는 다음과 같다.

1. native Markdown / GFM
2. source 자체로도 의미가 남는 convention을 MDAST/HAST에서 semantic enhancement
3. native Markdown으로 표현하기 어려운 경우에만 explicit MDX component

Site presentation 기능을 사용하기 위해 author가 Site-specific component syntax를 기본적으로 알아야 하는 구조는 피한다.

예를 들어 Obsidian callout, standalone external URL, wikilink처럼 원문에서도 의미를 이해할 수 있는 syntax는 필요가 확인되면 `@workspace/md`의 MDAST/HAST transform으로 richer component에 대응할 수 있다.

### Presentation does not own content identity

route parameter와 content metadata의 책임을 구분한다.

- `post.id` / `Astro.params.id`: 어떤 content entry를 route로 선택하는가
- `post.data`: title, description, author, date, tags, draft 같은 content metadata
- render result: headings, reading time 등 parsing/render 과정에서 파생된 정보

article title이나 description을 URL parameter에서 추론하지 않는다.

### Prefer maintained public extension points

외부 UI library를 사용할 때 DOM 구조에 강하게 결합한 selector override보다 공식 props, slots, providers, theme variables, headless primitives를 먼저 사용한다.

custom CSS는 Site 고유의 composition이나 외부 component가 해결하지 않는 요구에만 둔다.

## Ownership

| Concern                                      | Owner                                                           |
| -------------------------------------------- | --------------------------------------------------------------- |
| canonical article source                     | `ooMia/oomia.github.io.docs`                                    |
| article discovery/schema                     | Astro content collection in `apps/web`                          |
| Markdown/MDX parsing and semantic transforms | `@workspace/md`                                                 |
| Site route and page composition              | Astro layouts/pages in `apps/web`                               |
| maintained document typography primitives    | Fumadocs UI where adopted                                       |
| Site-specific reusable UI                    | `packages/ui` or the owning component                           |
| component-local presentation                 | owning component                                                |
| publishability contract                      | [Content consumption contract](content-consumption-contract.md) |
| presentation baseline                        | this document                                                   |

Fumadocs source/page-tree API는 현재 content source of truth가 아니다. 필요해질 때 도입할 수 있지만 C1-W4 baseline은 기존 Astro collection과 `@workspace/md`를 유지한다.

## Current baseline

### Content pipeline

유지한다.

```text
canonical Docs
  → Astro content collection
  → @workspace/md
  → Astro render()
  → Site presentation
```

Fumadocs를 도입하기 위해 canonical Docs, Astro collection 또는 기존 Markdown processor를 Fumadocs-specific source pipeline으로 migration하지 않는다.

### Global application layout

**Fumadocs `HomeLayout` + Site-owned article composition**을 baseline으로 한다.

HomeLayout은 navbar 중심의 얇은 Site shell로 사용한다. `SiteFrame`은 공식 header slot을 사용해 mobile에서도 theme control과 GitHub link를 직접 노출한다. 기본 mobile menu는 이 corpus에 필요하지 않다. `DocsLayout`과 `NotebookLayout`은 documentation-style sidebar/page-tree를 기본 전제로 하기 때문에 현재 Writing/blog 중심 corpus의 baseline으로 채택하지 않는다.

재검토 조건:

- article 수가 늘어나 계층 navigation이 실제 탐색 문제를 해결할 때
- category/version/page tree가 제품 정보 구조로 명시적으로 확정될 때

### Article layout

article은 Site-owned React `ArticleFrame` composition을 사용한다.

개념적 구조:

```text
RootProvider
└─ HomeLayout
   └─ ArticleFrame
      ├─ ArticleHeader
      ├─ AnchorProvider + ArticleTOC
      └─ DocsBody
         └─ rendered article content
```

Fumadocs `DocsPage`는 필요한 primitive/slot이 ArticleFrame의 유지보수를 유의미하게 줄일 때 선택적으로 사용할 수 있다. breadcrumb, documentation footer, permanent side TOC 같은 DocsPage 기본 기능을 필요 없이 도입하지 않는다.

### Article typography

Fumadocs `DocsBody`를 baseline typography owner로 사용한다.

목표는 기존 `notion.css`처럼 Site가 heading, paragraph, table, blockquote 등의 전체 typography system을 직접 유지하는 것을 피하는 것이다.

Notion-specific presentation은 사용하지 않는다. 다음 legacy implementation은 제거했다.

- `notion.css`
- hard-coded Notion cover
- hard-coded page emoji/icon
- Notion-specific page class/visual convention

canonical content semantics가 없는 cover/icon을 presentation layer에서 임의로 만들지 않는다.

### Width and spacing

폭 정책을 `body` 전역 스타일에서 분리한다.

현재 baseline:

- Site shell: 약 `80rem`까지 확장 가능
- article reading column: 약 `48rem` / Tailwind `max-w-3xl` 수준
- mobile gutter: 약 `1rem`
- tablet/desktop gutter: 약 `1.5rem`

정확한 값은 visual implementation에서 소폭 조정 가능하지만 다음 invariant는 유지한다.

- `body`가 article width를 소유하지 않는다.
- 넓은 viewport에서도 본문 line length가 계속 증가하지 않는다.
- header/navigation과 article reading width를 독립적으로 조절할 수 있다.

### Header

C1-W4 baseline은 작은 global navbar다.

- left: Site identity → home
- right: theme control, GitHub link
- search 없음
- category navigation 없음
- hamburger/menu tree 없음

navigation 요구는 실제 discovery 문제가 확인될 때 추가한다.

### Article header

C1-W4에서 먼저 표시할 정보:

- title from `post.data.title`
- description from `post.data.description`
- reading time from render result

date, tags, author presentation, updated date, publication state는 article metadata/publication 작업에서 정렬한다.

route parameter를 title fallback으로 사용하지 않는다.

### Table of contents

permanent documentation sidebar 대신 **compact sticky top TOC**를 baseline으로 한다.

behavior:

- 현재 active heading을 표시한다.
- 사용자가 전체 outline을 열 수 있다.
- heading 선택 시 해당 anchor로 이동하고 outline을 닫는다.
- native `details`/`summary`를 사용하며 Enter로 열고 Escape로 닫을 수 있다.
- heading이 없으면 TOC를 렌더링하지 않는다.
- JavaScript 없이도 본문과 native outline/anchor navigation을 사용할 수 있다.
- mobile에서는 같은 정보 구조를 compact popover/dropdown 형태로 제공할 수 있다.

active heading 추적은 Fumadocs Core `AnchorProvider`, `useActiveAnchor`, `TOCItem`이 소유한다. `single` 모드를 사용하고 Astro render headings를 `{ depth, title, url }`로 전달한다. Site는 별도 IntersectionObserver를 유지하지 않는다. navbar 3.5rem 아래에 TOC를 고정하고 heading의 scroll margin으로 두 control의 높이를 확보한다.

TOC의 정확한 visual control은 기본값 또는 작은 implementation choice로 취급한다. architecture decision으로 고정하지 않는다.

### Theme

현재 shadcn `aria-nova`의 palette와 visual style은 보존 의무가 없다.

Fumadocs `shadcn.css` preset과 기존 neutral shadcn tokens를 사용한다. 같은 canonical article에서 Fumadocs-native `neutral.css`도 light/dark로 렌더링해 비교했다. 두 경로 모두 읽을 수 있었지만 native preset은 Fumadocs 전용 color set과 `packages/ui`의 tokens를 별도로 유지하게 된다. shadcn preset은 두 component group이 하나의 token set을 소비하므로 추가 palette adapter 없이 cohesion을 유지한다.

선택 근거와 representative render는 [C1-W4 Evidence](evidence/c1-w4-presentation/README.md)에 남긴다. palette 자체는 유지 의무가 없으며 readability나 maintenance 측면에서 더 좋은 선택이 확인되면 변경할 수 있다.

### Theme state

`SiteFrame`의 Fumadocs Astro `RootProvider`가 theme lifecycle을 소유한다. Fumadocs의 theme switch를 public header slot에서 사용한다.

- system preference와 saved preference를 적용한다.
- explicit theme는 새로고침과 페이지 이동 후에도 유지된다.
- theme hotkey는 `hotKey: false`로 끈다.
- 별도의 custom ThemeToggle, initTheme, MutationObserver, localStorage runtime은 유지하지 않는다.
- 한 페이지의 provider/layout/article/TOC를 하나의 React island에서 구성한다. Astro-rendered canonical body는 그 tree에 static child로 전달한다.

### CSS ownership

#### Global CSS

다음만 소유한다.

- Tailwind/Fumadocs style imports
- theme tokens
- font
- minimal reset/base
- truly global accessibility/browser defaults

article typography를 위한 광범위한 element selector는 global CSS에 추가하지 않는다.

#### Site layouts

다음을 소유한다.

- container width
- page spacing
- navbar/article composition
- sticky TOC placement
- responsive composition

Astro scoped style 또는 Tailwind utility 중 더 단순한 쪽을 사용하며, 한 방식 자체를 정책 목표로 삼지 않는다.

#### Reusable components

Callout, LinkCard 같은 component는 자신의 semantic/visual boundary를 스스로 소유한다.

selector naming은 BEM 여부를 선결론으로 두지 않는다. component isolation, DOM refactor resilience, readability를 만족하는 가장 작은 selector contract를 사용한다.

#### Fumadocs UI

Fumadocs component 내부 DOM selector override를 기본 전략으로 사용하지 않는다. public props, slots, CSS variables, theme preset, headless primitive를 먼저 사용한다.

### Responsive behavior

Mobile:

- full-width viewport
- 약 `1rem` gutter
- compact navbar
- top TOC는 compact control
- permanent sidebar 없음

Tablet/Desktop:

- centered reading column
- 약 `48rem` article width
- Site chrome은 더 넓은 shell 사용 가능

Large desktop에서도 article body 자체는 읽기 폭을 유지한다.

### Markdown enrichment

C1-W4는 새로운 syntax transformation을 요구하지 않는다.

기존 Callout/LinkCard가 regression 없이 유지되는 것을 검증한다. 이후 richer presentation이 필요하면 다음 순서로 평가한다.

```text
native Markdown/GFM
  → recognizable Markdown convention
  → MDAST/HAST semantic transform
  → Site component
```

MDX component syntax는 이 방식으로 자연스럽게 표현하기 어려운 경우에만 선택한다.

### Draft visibility

목표 semantics는 다음으로 둔다.

- development: draft를 확인할 수 있음
- production: `draft: true` 제외

Astro `getCollection()`은 공식적으로 frontmatter filter와 `import.meta.env.PROD` 조건을 지원한다.

단 현재 canonical article corpus가 모두 `draft: true`이므로 즉시 적용하면 public article이 없어질 수 있다. 구현 난이도가 아니라 publish-state 결정의 문제이므로 실제 적용은 article metadata/publication 작업에서 처리한다.

## Explicit non-goals for C1-W4

다음은 presentation foundation의 선행 조건이 아니다.

- Fumadocs Source API/page tree migration
- documentation sidebar
- search
- pagination
- tag/category archive
- path-derived breadcrumb taxonomy
- previous/next article navigation
- full portfolio redesign
- CMS/editor UI
- new Markdown enrichment syntax
- UI component generator
- custom design system framework

## Implementation boundary

| File / component                  | Responsibility                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `RootLayout.astro`                | HTML/head/body, document title/description, app stylesheet                              |
| `SiteFrame.tsx`                   | Astro RootProvider, HomeLayout, public header slot and shared theme controls            |
| `ArticleFrame.tsx`                | `post.data` header, render-derived reading time, 48rem width, DocsBody and TOC provider |
| `ArticleTOC.tsx`                  | native compact outline UI and Fumadocs active-anchor consumption                        |
| `article.css`                     | small native Astro code-fence adapter; syntax highlighting remains Astro-owned          |
| `apps/web/src/styles/global.css`  | workspace UI globals + Fumadocs shadcn/preset imports                                   |
| `Callout.astro` / `link-card.css` | component-owned tone/visual boundary; existing render semantics preserved               |

Only `fumadocs-core` and `fumadocs-ui` are added as runtime presentation dependencies. `@playwright/test` is a development-only browser validation dependency. Fumadocs Source, search, OG and MDX processing are not introduced.

The homepage uses the same SiteFrame; its discovery structure remains #37. Production draft filtering and broader metadata/publication changes remain #36.

Current browser execution policy and commands are routed through [README Browser validation](../README.md#browser-validation), package scripts and Playwright config. [C1-W4 Evidence](evidence/c1-w4-presentation/README.md) and [homepage Evidence](evidence/c1-w4-homepage/README.md) are historical revision-bound snapshots, not current policy or deployment evidence.

## Revisit rules

다음 경우 이 문서를 먼저 갱신하거나 구현 PR에서 변경 이유를 명시한다.

- sidebar/page tree를 Site의 기본 navigation으로 도입
- content source를 Fumadocs Source API로 전환
- canonical authoring에 Site-specific MDX component syntax를 기본 요구
- global typography ownership을 Fumadocs에서 custom Site CSS로 이전
- article width/navigation/theme ownership을 구조적으로 변경
- theme provider를 Fumadocs 외 별도 runtime으로 교체

단순 palette, spacing, icon, breakpoint 같은 작은 visual tuning은 문서 갱신 없이 구현할 수 있다.

## Related work

- [#30 — define Fumadocs presentation and CSS ownership](https://github.com/ooMia/oomia.github.io/issues/30)
- [#35 — adopt Fumadocs UI as Site presentation foundation](https://github.com/ooMia/oomia.github.io/issues/35)
- [#36 — align article metadata and publication visibility](https://github.com/ooMia/oomia.github.io/issues/36)
- [#37 — replace scaffold homepage with article discovery](https://github.com/ooMia/oomia.github.io/issues/37)

## References

외부 라이브러리의 동작은 구현 시 현재 공식 문서를 다시 확인한다.

### Fumadocs

- Astro integration: https://www.fumadocs.dev/docs/manual-installation/astro
- Layout overview: https://www.fumadocs.dev/docs/ui/layouts
- Home Layout: https://www.fumadocs.dev/docs/ui/layouts/home-layout
- Docs Page / DocsBody: https://www.fumadocs.dev/docs/ui/layouts/page
- Root Provider: https://www.fumadocs.dev/docs/ui/layouts/root-provider
- Themes: https://www.fumadocs.dev/docs/ui/theme
- Headless TOC: https://www.fumadocs.dev/docs/headless/components/toc
- UI customization: https://www.fumadocs.dev/docs/guides/customize-ui

### Astro

- Content collections: https://docs.astro.build/en/guides/content-collections/
- Content API: https://docs.astro.build/en/reference/modules/astro-content/
