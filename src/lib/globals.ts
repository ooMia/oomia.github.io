import { createSchemaProxy } from "./proxy";

const blog = {
  image: {
    description: "블로그 대표 이미지를 포함한 IMG 태그",
  },
  link: {
    description: "블로그 url",
  },
  menu: {
    description: "블로그 메뉴 리스트",
  },
};

const revenue = {
  list: {
    upper: {
      description: "블로그 홈/목록 상단",
    },
    lower: {
      description: "블로그 홈/목록 하단",
    },
  },
};

const cover = {
  description:
    "개별 커버. `name` 애트리뷰트로 이름을 지정한다. 정의되지 않은 이름의 커버는 사용되지 않는다.",
  group: {
    description: "커버 그룹 치환자",
  },
  rep: {
    description: "개별 커버 표시",
  },
  title: {
    description: "개별 커버 타이틀",
  },
  url: {
    description:
      "그룹 태그: 커버 url이 있는 경우에만 치환.\n문자열: 개별 커버 url",
  },
  item: {
    description: "개별 커버 컨텐츠",
    not_article_info: {
      description:
        "컨텐츠가 글이 아닌 경우에만 치환 (내부 치환자는 s_cover_item에 직접 사용 가능)",
    },
    title: {
      description: "컨텐츠 타이틀",
    },
    summary: {
      description: "컨텐츠 요약/내용",
    },
    url: {
      description: "컨텐츠 url",
    },
    thumbnail: {
      description:
        "그룹 태그: 컨텐츠 이미지가 있는 경우에만 치환.\n문자열: 컨텐츠 이미지",
    },
    article: {
      info: {
        description: "컨텐츠가 글인 경우에만 치환",
        category: {
          description: "카테고리 명",
          url: {
            description: "카테고리 url",
          },
        },
        date: {
          description: "글 발행 날짜/시간 (yyyy.mm.dd HH:MM)",
        },
        simple_date: {
          description: "글 발행 날짜 (yyyy.mm.dd)",
        },
        comment_count: {
          description: "댓글 수",
        },
      },
    },
  },
};

// 1. 임의의 원본 상수 객체 정의 (as const를 쓰지 않아도 완벽 작동)
const rawSchema = {
  blog: blog,
  revenue: revenue,
  cover: cover,
  title: {
    description: "블로그 제목",
  },
  image: {
    description: "블로그 대표 이미지 url",
  },
  desc: {
    description: "블로그 설명",
  },
  blogger: {
    description: "블로그 소유자의 필명",
  },
  rss_url: {
    description: "rss feed 주소",
  },
  taglog_link: {
    description: "태그로그 url",
  },
  guestbook_link: {
    description: "방명록 url",
  },
  page: {
    title: {
      description: "페이지 제목",
    },
  },
  body_id: {
    description: "페이지 타입에 따른 id",
  },
};

// 2. $ 생성 ($의 타입은 rawSchema 구조를 자동으로 추론함)
export const $ = createSchemaProxy(rawSchema);
