# Content consumption contract

Site가 소유하는 콘텐츠 입력·렌더링·publishability 계약이다. Engine의 파일 수정 계약과 분리한다. 이 문서는 관찰 가능한 소비 경계와 검증 원칙을 설명하며, 실제 지원 syntax·component·schema의 세부 정의는 Site가 사용하는 코드와 package가 소유한다.

## 현재 소비 경계

현재 develop 기준 [content.config.ts](../apps/web/src/content.config.ts)는 `data/articles`의 Markdown/MDX를 읽고 title·description·author를 요구한다. draft·pubDate·updatedDate는 optional이다. 정확한 필드 타입과 author reference는 해당 schema가 소유한다. 이 문서 변경으로 loader, renderer, 입력 콘텐츠 또는 배포를 변경하지 않는다.

[Engine 수정 계약](https://github.com/ooMia/oomia.github.io.engine/blob/develop/docs/content-modification-contract.md)은 후처리 시 파일을 수정·보존하는 방법을 소유한다. 이 링크는 참고용이며 입력 생산 도구에 대한 의존성이 아니다. Site는 Docs 파일을 자신의 입력 계약에 따라 기계적으로 렌더링하며 Engine 내부 처리나 처리 이력을 알 필요가 없다. Site의 소비 실패는 Engine이 원문을 삭제하거나 자동으로 고칠 권한이 되지 않는다.

## Publishing

| 수준 | 보장 |
|---|---|
| Publishable | Site의 실제 입력 계약과 consumer 검증을 만족한다. |
| Blocked | 현재 Site가 소비할 수 없으며 실패 이유를 관찰 가능하게 제공한다. |

문서가 어떤 editor나 후처리 도구를 거쳤는지는 소비 판정에 사용하지 않는다. 사용자가 작성한 그대로 commit한 파일도 실제 입력 계약을 만족하면 소비한다. Engine 실행이나 별도 projection 생성을 공통 발행 선행 조건으로 요구하지 않는다.

문서나 planning manifest가 code보다 먼저 유효한 콘텐츠를 정의하지 않는다. 실제 parser/schema/renderer/component package와 build 검증이 현재 구현의 source of truth다.

## 1.0 소비 목표

| 콘텐츠 유형 | 소비 목표 | 설명 |
|---|---|---|
| 기본 Markdown / GFM | Publishable | 실제 parser와 renderer가 지원하는 source를 소비한다. |
| code fence | Publishable | 지원 language와 highlighting 동작은 실제 implementation으로 검증한다. |
| 일반 Markdown image | Publishable | 별도 Media DB object로 강제 변환하지 않는다. |
| workspace-relative asset | Publishable | repository portability와 Site asset resolution을 만족해야 한다. |
| durable external asset URL | Publishable | 허용 scheme/domain과 공개 정책을 만족해야 한다. |
| raw HTML | Site policy에 따라 Publishable/Blocked | public publish security policy에 따른다. |
| 지원 component package의 MDX component | Publishable | 실제 package/code가 제공하는 component semantics와 renderer 검증을 따른다. |
| 지원하지 않는 MDX component 또는 잘못된 props | Blocked | source는 보존할 수 있지만 현재 Site consumer가 유효하다고 판정하지 않는다. |
| arbitrary JavaScript expression | Blocked by default | 명시적 지원 전에는 executable content를 publish contract 밖에 둔다. |
| 문서 내부 임의 import/export | Blocked by default | document별 arbitrary dependency를 기본 허용하지 않는다. |
| 문법 오류가 있는 draft | Blocked | draft 저장과 publishability를 분리한다. |

## Component source of truth

component를 사용하는 경우 **renderer와 authoring integration이 동일한 component implementation source를 바라보는 것**을 기본으로 한다.

- Fumadocs UI 같은 외부 component package를 사용하면 해당 package와 실제 Site integration이 component semantics의 원본이다.
- custom component가 필요하면 Site와 authoring surface가 동일한 package/codebase를 소비하도록 구성한다.
- editor가 component palette, prop form, insert command 등 별도 형식의 metadata를 요구하면 원본 component implementation에서 필요한 정보를 노출하는 얇은 adapter를 둘 수 있다.
- adapter는 두 번째 component semantics 원본이 아니다. 가능한 한 같은 type/schema/code에서 파생하고 drift를 검증한다.
- Engine이나 Knowledge가 별도의 component catalog/manifest를 만들어 Site에 강제하지 않는다.
- Agent나 다른 consumer가 component 정보를 필요로 하면 owning implementation이 제공하는 code/API/adapter를 소비한다.

따라서 별도의 cross-repository manifest는 현재 필수 artifact가 아니다. 실제 implementation package와 adapter가 계약을 충분히 표현하면 코드가 문서를 대체할 수 있다.

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

- Astro structure는 유지 가능
- Fumadocs integration은 incremental하게 적용한다.
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
- 교차 레포 링크는 이관 branch를 가리킨다. 각 PR 통합 뒤 실제 원본 위치로 갱신한다.
