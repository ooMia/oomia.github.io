import { $ } from "#lib/tistory/globals";
import { describe, expect, test } from "bun:test";

describe("path conversion", () => {
  // 1. 기본 접근 테스트
  test("basic props", () => {
    expect(String($.cover.item.article)).toBe("cover_item_article");
    expect($.cover.item.article.toString()).toBe("cover_item_article");
    expect($.cover.item.article.valueOf()).toBe("cover_item_article");
  });

  test("props with underbar", () => {
    expect($.cover.item.not_article_info.toString()).toBe(
      "cover_item_not_article_info",
    );
  });

  // 2. JS 런타임 암묵적 형변환 (템플릿 리터럴 및 연산자)
  test("implicit string coercion", () => {
    // 템플릿 리터럴 내부 동작 (Symbol.toPrimitive -> toString)
    expect(`${$.blog.image}`).toBe("blog_image");

    // 문자열 연결 연산자 (+)
    expect("key: " + $.blog.image).toBe("key: blog_image");
  });
});

describe("schema path & doc resolution", () => {
  test("props with underbar & doc access", () => {
    // [경로 조인 검증]
    expect($.cover.item.not_article_info.toString()).toBe(
      "cover_item_not_article_info",
    );
    expect(`${$.cover.item.not_article_info}`).toBe(
      "cover_item_not_article_info",
    );

    // [설명문($doc) 조회 검증]
    expect($.cover.item.not_article_info.$doc).toBe(
      "컨텐츠가 글이 아닌 경우에만 치환 (내부 치환자는 s_cover_item에 직접 사용 가능)",
    );
  });
});
