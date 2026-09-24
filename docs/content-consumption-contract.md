# Content consumption contract

Site가 소유하는 콘텐츠 입력·렌더링·publishability 계약이다. Engine의 파일 수정 계약과 분리한다. 아래 지원 표와 검증 목록은 Knowledge에서 이관한 목표 계약이며 현재 모든 기능이 구현되었다는 뜻이 아니다.

## 현재 소비 경계

현재 develop 기준 [content.config.ts](../apps/web/src/content.config.ts)는 `data/articles`의 Markdown/MDX를 읽고 title·description·author를 요구한다. draft·pubDate·updatedDate는 optional이다. 정확한 필드 타입과 author reference는 해당 schema가 소유한다. 이 문서 변경으로 loader, renderer, 입력 콘텐츠 또는 배포를 변경하지 않는다.

[Engine 수정 계약](https://github.com/ooMia/oomia.github.io.engine/blob/docs/content-modification-contract/docs/content-modification-contract.md)은 후처리 시 파일을 수정·보존하는 방법을 소유한다. Engine의 prepare 성공을 Site build 성공으로 해석하지 않는다. Site의 소비 실패는 Engine이 원문을 삭제하거나 자동으로 고칠 권한이 되지 않는다.

## Publishing

| 수준 | 보장 |
|---|---|
| Publishable | Site의 입력 계약과 실제 consumer 검증을 만족한다. |
| Blocked | 현재 Site 계약을 만족하지 못하며 실패 이유를 관찰 가능하게 제공한다. |

Visual editor round-trip은 Site 소비의 필수조건이 아니다. 저장·후처리와 소비 가능성은 별도로 판정한다. consumer가 required field나 component 지원을 바꾸면 이 문서와 구현 schema를 갱신하고 Engine 수정 계약에 영향이 있는지 확인한다.

기존 post-commit projection 설계의 필요성·위치·owner는 [미결 사항](https://github.com/ooMia/oomia.github.io.knowledge/blob/docs/shared-repository-scheme/docs/open-questions.md#문서-소유권-검토)에서 계속 검토한다. 이번 이관으로 projection 생성을 Site 또는 Engine의 새로운 필수 구현으로 확정하지 않는다.

## 1.0 소비 목표

Editing·Storage 수준은 이 표에 복제하지 않는다. 저장 가능한 draft가 Site에서 소비 불가할 수 있다.

| 콘텐츠 유형 | 소비 목표 | 설명 |
|---|---|---|
| 기본 Markdown | Publishable | 선택된 editor와 Site가 같은 file을 손실 없이 공유해야 한다. |
| 일반 GFM table | Publishable | Visual 지원 수준이 source 보존 범위를 제한하지 않는다. |
| Fumadocs Editor가 표현하지 못하는 Markdown | Publishable | 실제 Site가 지원하면 발행할 수 있다. |
| 임의 code fence language | Publishable | syntax highlighting 지원 여부와 storage/publishability를 분리한다. |
| 일반 Markdown image | Publishable | 별도 Media DB object로 강제 변환하지 않는다. |
| workspace-relative asset | Publishable | repository portability와 Site asset resolution contract를 따라야 한다. |
| durable external asset URL | Publishable | 허용 scheme/domain과 portability policy를 따른다. |
| raw HTML | Site policy에 따라 Publishable/Blocked | Visual 지원과 실행 허용을 분리한다. |
| Obsidian-native callout / styled Markdown primitive | Publishable | Obsidian authoring UX와 Site remark/renderer mapping을 우선 검토한다. |
| Fumadocs built-in MDX component | Publishable | Site에서는 우선 재사용하되 canonical source syntax로 직접 사용할지는 Obsidian interoperability와 함께 판단한다. |
| custom MDX component + visual spec | Publishable | 명시된 component contract와 Site consumer 검증을 통과해야 한다. |
| custom MDX component + visual spec 없음 | Publishable 가능 | visual adapter 부재만으로 차단하지 않는다. |
| contract에 없는 MDX component | Blocked | source는 보존하되 현재 Site contract가 없으면 발행하지 않는다. |
| 잘못된 component props | Blocked | file 저장과 publish validation을 분리한다. |
| arbitrary JavaScript expression | Blocked by default | 명시적 지원 계약 전에는 executable content를 publish contract 밖에 둔다. |
| 문서 내부 임의 import/export | Blocked by default | document별 arbitrary dependency를 기본 허용하지 않는다. |
| 문법 오류가 있는 draft | Blocked | draft source는 저장 가능하며 publish에서 차단한다. |

## Component contract

Fumadocs built-in component를 우선 활용한다.

- built-in component의 이름/props를 그대로 canonical syntax로 사용할 수 있는 경우 불필요한 wrapper를 만들지 않는다.
- 플랫폼에서 허용할 component subset이 필요하면 supported profile을 명시한다.
- custom component가 필요하면 name / props / children / source semantics를 먼저 정의한다.
- Engine authoring spec과 Site renderer가 shared runtime contract를 필요로 할 때만 manifest 또는 shared package를 도입한다.
- 별도 `@oomia/content-components` renderer library는 1.0 필수조건이 아니다.

[Content Component Manifest Schema](https://github.com/ooMia/oomia.github.io.knowledge/blob/docs/shared-repository-scheme/schemas/content-component-manifest.schema.json)는 custom component contract가 실제로 필요해질 때 사용할 수 있는 planning schema다.

## Publish validation 원칙

Publish validation은 editor round-trip 여부가 아니라 **현재 canonical files가 Site에서 안전하고 재현 가능하게 소비되는가**를 판정한다.

최소 검증:

1. workspace/file layout와 frontmatter schema
2. Markdown/MDX parse
3. component contract / dangerous expression policy
4. asset resolution
5. Site sync/typecheck/test/build
6. canonical docs commit과 Site revision linkage

Source를 publish 전에 visual editor codec으로 decode/encode하는 절차는 요구하지 않는다.

## Consumer integration 전환

Site는 이미 docs consumption → Astro build → GitHub Pages delivery Evidence가 있으므로 Engine과 달리 greenfield를 기본값으로 하지 않는다.

- Astro structure는 유지 가능
- Fumadocs integration은 incremental spike
- Turbo 전환은 아래 Toolchain 전환 절이 소유
- generic `packages/ui`, `packages/md`는 실제 새 responsibility와 맞는지 integration 과정에서 재검토

## Toolchain 전환

Vite+와 Turbo를 함께 사용하는 기존 Site의 전환 방향이다. 공통 개발 기준은 Knowledge가 소유하고, 이 절은 Site에 적용할 migration 제약만 다룬다.

Turbo는 즉시 삭제하지 않지만 새 workflow가 Turbo dependency를 확대하지 않는다. VP recursive/filter/cache가 현재 Turbo usage를 대체할 수 있는지 parity를 검증한 뒤 정리한다. 이 문서 이관은 Turbo 제거, Fumadocs 도입 또는 build/deployment 검증을 수행한 것으로 간주하지 않는다.

## 이관 및 적용

- [Site Issue #10](https://github.com/ooMia/oomia.github.io/issues/10)
- [Knowledge coordination](https://github.com/ooMia/oomia.github.io.knowledge/issues/10)
- 출처: Knowledge의 `content-authoring-contract.md` 중 Publishing / 1.0 목표 정책 테이블의 소비 관련 열 / Component contract / Publish validation 원칙.
- 교차 레포 링크는 문서 이관 branch를 가리킨다. 각 PR 통합 뒤 실제 원본 위치로 갱신한다.
