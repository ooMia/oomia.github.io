# 프로젝트 유지보수 문서

이 문서는 프로젝트를 초기화 및 빌드하는 절차를 설명합니다.

## 1. 저장소 설정 (Repository Setup)

단순한 `git clone` 대신, 포함된 서브모듈까지 모두 한 번에 재귀적으로 초기화하려면 다음 명령어를 사용하세요:

```sh
git clone --recursive https://github.com/ooMia/oomia.github.io.git
```

이미 `git clone`을 수행한 경우, 다음 명령어로 서브모듈을 초기화할 수 있습니다:

```sh
git submodule update --init --recursive
```

## 2. 서브모듈 수정 (Modifying Submodules)

> 모든 서브모듈은 독립적인 저장소로 관리되므로, 수정을 위해서는 반드시 **각 서브모듈의 기본 브랜치**에 변경 사항이 반영되어야 합니다.

- `content` 디렉토리는 Obsidian 기반의 문서를 포함하고 있으며, 앱의 보관함으로 설정하여 자유롭게 컨텐츠를 추가하거나 수정하면 됩니다.
- `builder` 디렉토리는 Github Pages를 만들기 위한 Node 프로젝트입니다. 컨텐츠의 렌더링 형태와 관련된 모든 설정과 로직은 이곳에 포함되어 있습니다.

## 3. 로컬 검증 (Local Verification)

`content` 디렉토리의 내용이 수정되었다고 가정할 때, 로컬에서 빌드가 정상적으로 동작하는지 확인하기 위해 다음 작업을 수행합니다.

`builder` 디렉토리로 이동하여 다음 명령어를 순서대로 실행하세요:

```sh
# builder 디렉토리로 이동
cd builder

# 의존성 설치 (개발 의존성 제외)
npm ci --omit=dev --prefer-offline

# Quartz 설정 및 컨텐츠 소스 연결 (Symlink 전략 사용)
npx quartz create --strategy symlink --source ../content --links shortest

# 빌드 및 서빙 (상세 로그 출력)
npx quartz build -v --serve
```

이 과정은 CI/CD 워크플로우에서 수행되는 작업과 동일하며, 로컬에서 변경 사항을 미리 검증하는 데 사용됩니다.

## 4. 향후 방향성 (Future Roadmap)

현재는 위와 같이 수동으로 빌드 및 결과를 확인해야 합니다. 향후에는 테스트 프레임워크를 도입하여 원하는 결과를 자동으로 검증하는 시스템을 구축할 예정입니다.
