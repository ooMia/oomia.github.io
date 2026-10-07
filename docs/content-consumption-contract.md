# Content consumption contract

Site가 소유하는 콘텐츠 입력·렌더링·publishability 계약이다. Engine의 파일 수정 계약과 분리한다. 이 문서는 관찰 가능한 소비 경계와 검증 원칙을 설명하며, 실제 지원 syntax·component·schema의 세부 정의는 Site가 사용하는 코드와 package가 소유한다.

Site의 layout·typography·theme·navigation 같은 presentation 정책은 [Site presentation foundation](presentation-foundation.md)이 소유한다. 소비 계약은 특정 presentation library나 visual layout을 publishability의 선행 조건으로 만들지 않는다.

## 현재 소비 경계

현재 구현의 [content.config.ts](../apps/web/src/content.config.ts)는 `data/articles/content/articles/**/*.{md,mdx}`를 Article collection으로 읽는다. canonical source에서 `title / description / author`는 필수이며 `tags / aliases / date / updatedDate / draft`는 optional이다. source field 이름과 public presentation model은 [article-metadata.ts](../apps/web/src/lib/content/article-metadata.ts)의 adapter에서 분리한다.

public article model은 다음 의미를 사용한다.

- `publishedAt`: explicit `date`가 우선이며, 없을 때만 Docs Git history의 earliest non-merge author revision을 fallback으로 사용한다.
- `updatedAt`: explicit `updatedDate`가 우선이며, 없을 때만 Docs Git history의 latest non-merge author revision을 fallback으로 사용한다.
- Git fallback은 full/reliable Docs history를 읽을 수 있을 때만 사용하고, 불가능하면 값을 만들지 않는다.
- author source value는 single-author Site identity로 case-insensitive하게 매핑한다. 현재 canonical corpus의 `oomia`와 article template의 `ooMia`를 같은 author로 취급한다.
- authored tag casing/order와 aliases는 보존한다. aliases는 현재 public route를 만들지 않는다.
- reading time/headings는 canonical frontmatter가 아니라 기존 Astro + `@workspace/md` render result에서 파생한다.

Article route와 homepage collection access는 [articles.ts](../apps/web/src/lib/content/articles.ts)의 동일한 visibility/order policy를 소비한다. `FILTER_DRAFT_ARTICLES=true`일 때만 `draft: true` entry를 제외하며, unset/false에서는 draft를 계속 포함한다. 현재 Pages/default는 filtering OFF다.

listing order는 `publishedAt` descending, missing date last, article id ascending tie-break로 deterministic하게 유지한다. route identity는 계속 Astro collection `entry.id`이며 aliases를 URL alias로 해석하지 않는다.

Git-derived fallback을 위해 CI는 parent Site checkout을 shallow로 유지하고 Docs는 full history로 읽는다. PR validation (`main`/`develop`)과 manual OS compatibility는 매 실행 시 Docs `main` HEAD를 `apps/web/data/articles`에 checkout한다. Pages production은 build job 시작에 최신 Docs `main`을 한 번 immutable SHA로 resolve하고 exact SHA를 full-history checkout한다. build 도중 moving `main`을 다시 조회하지 않는다. runtime checkout은 Site의 저장된 gitlink를 수정하거나 commit하지 않으며, 저장된 gitlink는 local default 재현에 계속 사용한다. 각 job은 실제 Site/Docs SHA와 저장된 gitlink를 summary에 기록한다. production은 resolved Docs SHA를 release provenance로 사용한다. 기존 pinned-history 동작의 historical Evidence는 [#42](https://github.com/ooMia/oomia.github.io/issues/42)에 보존하며, production stored-pin 정책은 [coordination decision #67](https://github.com/ooMia/oomia.github.io.knowledge/issues/67)이 supersede한다.

[Engine 수정 계약](https://github.com/ooMia/oomia.github.io.engine/blob/main/docs/content-modification-contract.md)은 후처리 시 파일을 수정·보존하는 방법을 소유한다. 이 링크는 참고용이며 입력 생산 도구에 대한 의존성이 아니다. Site는 Docs 파일을 자신의 입력 계약에 따라 기계적으로 렌더링하며 Engine 내부 처리나 처리 이력을 알 필요가 없다. Site의 소비 실패는 Engine이 원문을 삭제하거나 자동으로 고칠 권한이 되지 않는다.

## Publishing

| 수준        | 보장                                                             |
| ----------- | ---------------------------------------------------------------- |
| Publishable | Site의 실제 입력 계약과 consumer 검증을 만족한다.                |
| Blocked     | 현재 Site가 소비할 수 없으며 실패 이유를 관찰 가능하게 제공한다. |

문서가 어떤 editor나 후처리 도구를 거쳤는지는 소비 판정에 사용하지 않는다. 사용자가 작성한 그대로 commit한 파일도 실제 입력 계약을 만족하면 소비한다. Engine 실행이나 별도 projection 생성을 공통 발행 선행 조건으로 요구하지 않는다.

문서나 planning manifest가 code보다 먼저 유효한 콘텐츠를 정의하지 않는다. 실제 parser/schema/renderer/component package와 build 검증이 현재 구현의 source of truth다.

## 1.0 소비 목표

| 콘텐츠 유형                                   | 소비 목표                              | 설명                                                                       |
| --------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| 기본 Markdown / GFM                           | Publishable                            | 실제 parser와 renderer가 지원하는 source를 소비한다.                       |
| code fence                                    | Publishable                            | 지원 language와 highlighting 동작은 실제 implementation으로 검증한다.      |
| 일반 Markdown image                           | Publishable                            | 별도 Media DB object로 강제 변환하지 않는다.                               |
| workspace-relative asset                      | Publishable                            | repository portability와 Site asset resolution을 만족해야 한다.            |
| durable external asset URL                    | Publishable                            | 허용 scheme/domain과 공개 정책을 만족해야 한다.                            |
| raw HTML                                      | Site policy에 따라 Publishable/Blocked | public publish security policy에 따른다.                                   |
| 지원 component package의 MDX component        | Publishable                            | 실제 package/code가 제공하는 component semantics와 renderer 검증을 따른다. |
| 지원하지 않는 MDX component 또는 잘못된 props | Blocked                                | source는 보존할 수 있지만 현재 Site consumer가 유효하다고 판정하지 않는다. |
| arbitrary JavaScript expression               | Blocked by default                     | 명시적 지원 전에는 executable content를 publish contract 밖에 둔다.        |
| 문서 내부 임의 import/export                  | Blocked by default                     | document별 arbitrary dependency를 기본 허용하지 않는다.                    |
| 문법 오류가 있는 draft                        | Blocked                                | draft 저장과 publishability를 분리한다.                                    |

## Component source of truth

component를 사용하는 경우 **renderer와 authoring integration이 동일한 component implementation source를 바라보는 것**을 기본으로 한다.

- Fumadocs UI 같은 외부 component package를 사용하면 해당 package와 실제 Site integration이 component semantics의 원본이다.
- custom component가 필요하면 Site와 authoring surface가 동일한 package/codebase를 소비하도록 구성한다.
- editor가 component palette, prop form, insert command 등 별도 형식의 metadata를 요구하면 원본 component implementation에서 필요한 정보를 노출하는 얇은 adapter를 둘 수 있다.
- adapter는 두 번째 component semantics 원본이 아니다. 가능한 한 같은 type/schema/code에서 파생하고 drift를 검증한다.
- Engine이나 Knowledge가 별도의 component catalog/manifest를 만들어 Site에 강제하지 않는다.
- Agent나 다른 consumer가 component 정보를 필요로 하면 owning implementation이 제공하는 code/API/adapter를 소비한다.

따라서 별도의 cross-repository manifest는 현재 필수 artifact가 아니다. 실제 implementation package와 adapter가 계약을 충분히 표현하면 코드가 문서를 대체할 수 있다.

## Authoring-neutral enhancement

canonical source는 특정 presentation framework에 종속되지 않는 Markdown/GFM 표현을 우선한다.

rich presentation이 필요할 때는 source 의미를 유지할 수 있다면 Markdown convention을 `@workspace/md`의 MDAST/HAST stage에서 semantic component로 변환하는 방식을 우선 검토한다. explicit MDX component는 native Markdown/convention으로 의미를 충분히 표현하기 어려울 때 사용할 수 있다.

이 원칙은 모든 Markdown extension을 자동으로 지원한다는 계약이 아니다. 실제 supported syntax와 transformation은 parser/renderer implementation과 tests가 소유한다.

## Publish validation 원칙

Publish validation은 **현재 canonical files가 Site에서 안전하고 재현 가능하게 소비되는가**를 판정한다.

최소 검증:

1. workspace/file discovery와 frontmatter schema
2. Markdown/MDX parse
3. 실제 component package/renderer compatibility와 executable-content policy
4. asset resolution
5. Site sync/typecheck/test/build
6. canonical Docs commit과 Site revision linkage

editor round-trip이나 특정 editor 실행 이력은 publish gate가 아니다.

## Consumer integration 전환

Site는 이미 docs consumption → Astro build → GitHub Pages delivery Evidence가 있으므로 Engine과 달리 greenfield를 기본값으로 하지 않는다.

- 기존 Astro content collection과 rendering boundary를 불필요하게 교체하지 않는다.
- Fumadocs integration은 incremental하게 적용하고 presentation baseline은 [Site presentation foundation](presentation-foundation.md)에서 관리한다.
- authoring UI가 필요하면 현재 Site repository 안에서 구현할 수 있으나, editor 종류는 Site consumer contract 자체의 전제 조건이 아니다.
- component integration은 별도 planning manifest보다 실제 package/code와 tests를 우선한다.
- generic `packages/ui`, `packages/md` 등 기존 package 경계는 실제 책임과 맞는지 integration 과정에서 재검토한다.

## Toolchain 전환

Vite+와 Turbo를 함께 사용하는 기존 Site의 전환 방향이다. 공통 개발 기준은 Knowledge가 소유하고, 이 절은 Site에 적용할 migration 제약만 다룬다.

Turbo는 즉시 삭제하지 않지만 새 workflow가 Turbo dependency를 확대하지 않는다. VP recursive/filter/cache가 현재 Turbo usage를 대체할 수 있는지 parity를 검증한 뒤 정리한다. 이 문서 이관은 Turbo 제거, Fumadocs 도입 또는 build/deployment 검증을 수행한 것으로 간주하지 않는다.

## 이관 및 적용

- [Site Issue #10](https://github.com/ooMia/oomia.github.io/issues/10)
- [Knowledge coordination](https://github.com/ooMia/oomia.github.io.knowledge/issues/10)
- 초기 이관 내용의 provenance는 관련 PR/Git history에 남긴다. 현재 소비 계약의 원본은 이 문서와 실제 Site code/package다.

## Markdown / MDX LinkCard boundary

`.md` uses Astro's native Sätteri Markdown processor with ordinary external anchors and no automatic LinkCard transform. `.mdx` uses Astro's native MDX integration and its public `processor: unified(...)` configuration. No source rename/rewrite, custom Markdown renderer, second document compilation or generated function-body evaluation is involved.

`@workspace/md` owns standard MDAST/MDX link normalization and the replaceable standalone predicate. CommonMark inline and full/collapsed/shortcut reference links, and lowercase JSX `a[href]` with a statically known string, are normalized before Site chooses a component target. JSX string literals, parenthesized strings and non-interpolated template literals require parser-provided static ESTree; no second parser or evaluation is used. Dynamic expressions, spreads and ambiguous hrefs retain native anchor rendering. Candidate detection uses node semantics and position provenance; GFM bare-link literals, wikilinks and custom directives do not become cards merely because a renderer produces an anchor. Only standalone blocks at the root or inside blockquotes/list items are eligible. Tables, footnotes (including nested blockquotes), authored JSX containers, inline/internal/non-HTTP/multiple-content links retain native rendering. CommonMark reference matching and first-definition precedence belong to the parser and declared `mdast-util-definitions` utility. Only external absolute HTTP(S) destinations use WHATWG `new URL(value).href`; internal/file destinations retain their authored value in native nodes. The transform does not normalize path case/Unicode/encoding, repair file references, or define document/Git lineage identity.

Site owns the local derived-manifest adapter, `LinkCardProps`, component mapping, and [LinkCard.astro](../apps/web/src/components/LinkCard.astro). The transform creates a component target, never visual DOM. Valid url/title records render basic cards; optional available remote preview image/site name and valid locale/exactly-three ordered summary rows enrich the card. Malformed optional v2 data leaves usable basic metadata intact; unusable local metadata leaves authored source links intact. Full provider summary and provenance are outside compact props.

`summaryLines` are exactly three ordered semantic fragments, not a guarantee of three physical lines at every width. Narrow cards render one flowing summary with visual separators and natural wrapping. Cards with at least `36rem` of content width render three ordered rows. The component preserves every fragment verbatim, including out-of-budget output, without ellipsis, clipping or horizontal overflow; typography stays `0.875rem`. Container width, rather than viewport width, also accommodates cards inside narrow lists/columns.

The [responsive density evidence](evidence/link-card-density/README.md) selects **24 Unicode code points per fragment for ko-KR** as the current Site calibration recommendation for Engine's explicit `maxCharactersPerLine` input. That field name and `summaryLines` schema remain unchanged. This is a generation budget, not a consumer rejection/truncation threshold or a universal physical-line guarantee. The earlier 14-code-point measurement belongs to #53's historical single-line first slice. Real producer quality and re-preparation of persisted records remain Engine/Docs responsibilities.

Build/render only reads the local Docs manifest at the revision selected by the owning workflow. It does not fetch target URLs, call LilysAI/Ollama, or download/optimize remote preview images. Browser images use the producer's absolute HTTP(S) URL directly. Summary rows use plain escaped text and natural wrapping for overlong input; clipping/ellipsis never hides producer length problems. The measured ko-KR typography fixture bound is **14 Unicode code points per row**, at 320/390/768/1440px with the current 14px typography. See [revision-bound evidence and limitations](evidence/mdx-link-card/README.md); this does not silently change Engine constraints or claim real v2 delivery.

Cards contain one navigation anchor and no nested interactive controls. Desktop detail sidebar behavior remains deferred under Site #54; no sidebar or intercepted first tap is introduced on mobile. This DOM also leaves ordinary inline links available for future delegated hover/focus interaction.

The earlier [Markdown component spike](evidence/markdown-to-js/README.md) and Draft PR #59 remain investigation history. Its executable tree, script, spike-only dependencies and legacy HAST LinkCard implementation have been removed from this branch; the revision-bound investigation document links to immutable history.

## Article social metadata and derived previews

Article title/description/author/dates/tags project through one Site-owned social metadata adapter. Standard meta description, Open Graph, X and Article JSON-LD share the same Article description; no summary or social-only frontmatter is required. Canonical and image URLs use configured Site URL/base. Optional dates/tags are omitted when unavailable; screenshots are social assets and do not automatically become JSON-LD representative images.

Every article exposes `meta[name="oomia:docs-revision"]` from the actual `apps/web/data/articles` checkout. Local default `pinned` mode rejects a checkout that differs from the stored gitlink. CI validation explicitly selects `DOCS_CHECKOUT_MODE=main` and verifies HEAD against the fetched `origin/main` snapshot. Production selects `DOCS_CHECKOUT_MODE=resolved` and verifies the actual checkout against `DOCS_CHECKOUT_REVISION`, the SHA resolved once at release start; later movement of `origin/main` cannot alter that release. The recorded checkout SHA also keys the root build cache, but caller-supplied SHA metadata never determines the public marker. Output verification checks canonical/social URLs and that every built Article exposes exactly that actual SHA. Engine validates this fixed marker against the expected Docs SHA before capture.

Production also validates Docs-owned `derived/site-consumption.json` before build. Its schema, producer provenance, current-candidate success/unavailable coverage and persistence are owned by [Docs](https://github.com/ooMia/oomia.github.io.docs/blob/main/docs/enrichment-workflow.md). Docs asserts that every currently discovered candidate belongs to the success/unavailable union; retained historical records can exceed the current-candidate counts. Site checks the attested hashes/count sum and sidecar schema/overlap without rediscovering candidates from canonical source. It verifies `canonicalTree` against `HEAD:content`, rejects dirty/untracked canonical content, checks all consumed manifest/preview binary hashes, and checks preview `sourceSha256` against current authored bytes. It rejects unsupported unavailable codes/schema and duplicate or overlapping success/unavailable URLs. A snapshot captured before preparation converges fails with an explicit readiness error; that release never switches to another SHA. After Docs preparation finishes, a new release may resolve the completed snapshot.

The live consumer graph includes Article Markdown/MDX, their Docs Git history, `derived/external-links.json`, optional `derived/article-previews.json` and its referenced PNGs. Production additionally reads the readiness attestation and `derived/external-links-unavailable.json` for integrity checks. Unavailable semantic candidates have no successful metadata record, so native MDX transformation leaves their authored anchor intact while unrelated successful URLs render LinkCards. Native `.md` links continue to use Markdown grammar. Site does not create or refresh these Docs-owned artifacts.

Docs owns `derived/article-previews.json` (`schemaVersion: 1`, `records`). Each record uses `sourcePath` under `content/articles/` as stable source identity, independent of its deployed URL. It includes `imagePath: derived/article-previews/<sha256>.png`, SHA-256, byte count, `mediaType: image/png`, width 1200 and height 630, plus producer/persistence provenance documented in Docs. Site validates identity, namespace containment, PNG header/dimensions and bytes/hash, then includes that binary at `/social-previews/<sha256>.png` and emits absolute `og:image` and `twitter:image`. Unsupported/corrupt preview data fails closed. A missing manifest or missing record remains a valid non-image article. Existing previews remain stable; Site does not trigger freshness or capture.

`@workspace/md/runtime` exposes lightweight render schema and URL normalization separately from build-time processors/native bindings. Site does not run a browser during build. Preview-present/absent output is covered by `apps/web/tests/article-preview-build.mjs`; full local E2E includes rendered article head assertions.
