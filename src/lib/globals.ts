/**
 * Placeholder 정의/조회 유틸리티.
 *
 * 사용법:
 *   export const placeholders = definePlaceholders({
 *     title: { description: "블로그 제목" },
 *     revenue: {
 *       list: {
 *         upper: {},   // 메타데이터 없는 리프도 그냥 {}
 *         lower: {},
 *       },
 *     },
 *   } as const);
 *
 *   placeholders.title.toString();        // "[##_title_##]"
 *   placeholders.revenue.list.upper.id;   // "revenue.list.upper"
 *   placeholders.$("revenue.list.upper"); // PlaceholderRef
 */

/** 리프에 올 수 있는 메타데이터 필드. 이 키들 외의 프로퍼티가 있으면 하위 트리로 취급한다. */
const META_KEYS = new Set(["description", "isOption"]);

class PlaceholderRef {
  private constructor(
    readonly id: string,
    readonly description: string,
    readonly isOption: boolean,
  ) {}

  /** @internal definePlaceholders 내부에서만 생성한다. */
  static _create(
    id: string,
    description = id,
    isOption = false,
  ): PlaceholderRef {
    return new PlaceholderRef(id, description, isOption);
  }

  private get token(): string {
    return (this.isOption ? "var_" : "") + this.id.replaceAll(".", "_");
  }

  toString(): string {
    return `[##_${this.token}_##]`;
  }

  toTag(children?: string): string {
    return `<s_${this.token}>${children}</s_${this.token}>`;
  }

  ifExist(children?: string): string {
    return `<s_if_${this.token}>${children}</s_if_${this.token}>`;
  }

  ifNotExist(children?: string): string {
    return `<s_if_not_${this.token}>${children}</s_if_not_${this.token}>`;
  }
}

/** 사용자가 작성하는 리프 노드: 메타 필드만 가진 순수 객체 (보통 {}). */
type PlaceholderLeaf = {
  description?: string;
  isOption?: boolean;
};

type PlaceholderTree = {
  [key: string]: PlaceholderLeaf | PlaceholderTree;
};

/**
 * 트리 형태를 그대로 유지하되, 리프만 PlaceholderRef로 치환한 결과 타입.
 * 주의: PlaceholderLeaf는 필드가 전부 optional이라 `{}` 및 임의의 하위 트리와도
 * 구조적으로 호환된다. 그래서 "하위 트리인가"를 먼저 검사하고, 아닐 때만
 * 리프로 판정해야 각 키가 정확히 하나의 분기로만 떨어진다(분기가 겹치면
 * 결과 타입에 never가 섞여 속성 접근 시 타입 오류가 난다).
 */
type Build<T extends PlaceholderTree> = {
  [K in keyof T]: T[K] extends PlaceholderTree
    ? T[K] extends PlaceholderLeaf
      ? PlaceholderRef
      : Build<T[K]>
    : PlaceholderRef;
};

type PlaceholderRegistry<T extends PlaceholderTree> = Build<T> & {
  /** id("revenue.list.upper")로 등록된 모든 PlaceholderRef를 조회. */
  readonly byId: ReadonlyMap<string, PlaceholderRef>;
  /** byId.get()의 편의 버전. 없으면 예외를 던진다. */
  $(id: string): PlaceholderRef;
};

/** 리프 노드인지 판별. 메타 키 외의 프로퍼티가 하나라도 있으면 하위 트리로 본다. */
function isLeaf(
  value: PlaceholderLeaf | PlaceholderTree,
): value is PlaceholderLeaf {
  return Object.keys(value).every((key) => META_KEYS.has(key));
}

function joinId(path: readonly string[], key: string): string {
  return [...path, key].join(".");
}

function definePlaceholders<const T extends PlaceholderTree>(
  tree: T,
): PlaceholderRegistry<T> {
  const byId = new Map<string, PlaceholderRef>();

  function build(
    node: PlaceholderTree,
    path: readonly string[],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(node)) {
      const id = joinId(path, key);

      if (isLeaf(value)) {
        const ref = PlaceholderRef._create(
          id,
          value.description,
          value.isOption,
        );
        byId.set(id, ref);
        result[key] = ref;
      } else {
        result[key] = build(value, [...path, key]);
      }
    }

    return result;
  }

  const registry = build(tree, []);

  return Object.assign(registry, {
    byId,
    $(id: string): PlaceholderRef {
      const ref = byId.get(id);
      if (!ref) throw new Error(`Unknown placeholder: ${id}`);
      return ref;
    },
  }) as PlaceholderRegistry<T>;
}

const placeholders = definePlaceholders({
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
  blog: {
    image: {
      description: "블로그 대표 이미지를 포함한 IMG 태그",
    },
    link: {
      description: "블로그 url",
    },
    menu: {
      description: "블로그 메뉴 리스트",
    },
  },
  rss: {
    url: {
      description: "rss feed 주소",
    },
  },
  taglog: {
    link: {
      description: "태그로그 url",
    },
  },
  guestbook: {
    link: {
      description: "방명록 url",
    },
  },
  revenue: {
    list: {
      upper: {
        description: "블로그 홈/목록 상단",
      },
      lower: {
        description: "블로그 홈/목록 하단",
      },
    },
  },
  page: {
    title: {
      description: "페이지 제목",
    },
  },
  body: {
    id: {
      description: "페이지 타입에 따른 id",
    },
  },
  cover: {
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
  },
} as const);

export { placeholders as $ };
