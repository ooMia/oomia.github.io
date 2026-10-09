# Site Agent entry point

> **Authority:** REFERENCE\
> **Owner:** Site repository task routing\
> **Scope:** Agent work in `ooMia/oomia.github.io`\
> **Read when:** starting or resuming work in this repository\
> **Source of truth:** Knowledge policy owners and Site code, contracts, configuration, and live GitHub state

프로젝트 context와 공통 정책은 [Knowledge CONTEXT](https://github.com/ooMia/oomia.github.io.knowledge/blob/main/CONTEXT.md)에서 필요한 owner로 진입한다. user/Agent interaction, approval, tool failure, capability fallback, remote-state interpretation은 CONTEXT가 연결하는 `agent-conventions.md`를 읽는다.

Site 작업과 검증 방법은 [README](README.md), 콘텐츠 입력·렌더링·publishability는 [Content consumption contract](docs/content-consumption-contract.md), presentation은 [Presentation foundation](docs/presentation-foundation.md)에서 찾는다. 구체적인 command, supported syntax, workflow 동작은 해당 Site code/config가 소유한다.

Site는 Docs의 canonical content를 소비한다. `.md`와 `.mdx`의 native grammar를 보존하며, build/render에서 provider나 target URL을 호출하거나 Docs-owned derived artifacts를 생성·갱신하지 않는다. Docs revision 선택과 immutable snapshot 검증은 [소비 계약](docs/content-consumption-contract.md#article-social-metadata-and-derived-previews) 및 owning workflow를 따른다.
