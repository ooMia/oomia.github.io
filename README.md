# 프로젝트 구조

```sh
.
├── data
│   ├── articles # 문서 폴더
│   └── author.json # 작성자 정보
├── lib
│   └── gravatar.ts # Gravatar 프로필 로더
├── plugins
│   ├── mdast
│   │   ├── reading-time # 읽기 시간 계산
│   │   │   ├── index.ts # 플러그인 정의
│   │   │   ├── lib.test.ts
│   │   │   ├── lib.ts
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   └── types.ts
│   ├── render.ts # render() typed-wrapper
│   ├── schema.ts
│   └── types.ts
├── src
│   ├── components
│   │   ├── Article.astro # Notion 문서 레이아웃
│   │   ├── Callout.astro # Notion 콜아웃
│   │   └── GravatarCard.astro # Gravatar 프로필
│   ├── content.config.ts # 문서 frontmatter 정의
│   ├── env.d.ts # .env schema
│   ├── layouts
│   │   ├── BodyLayout.astro
│   │   ├── HeadLayout.astro
│   │   └── RootLayout.astro
│   ├── pages
│   │   ├── articles
│   │   │   └── [...id].astro # 문서 렌더 경로
│   │   ├── index.astro
│   │   └── robots.txt.ts # robots.txt
│   └── styles
│       └── base.css
├── astro.config.mts
├── bun.lock
├── LICENSE
├── package.json
├── prettier.config.mts
├── README.md
└── tsconfig.json
```

## 특징

- CLI option < .env
