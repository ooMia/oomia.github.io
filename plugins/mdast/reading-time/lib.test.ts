import { describe, expect, test } from "bun:test";
import getReadingTime from "./lib";

describe("calculateReadingStatistics", () => {
  test("counts English words", () => {
    const result = getReadingTime("Lorem ipsum dolor sit amet.");

    expect(result.words.en).toBe(5);
    expect(result.words.ko).toBe(0);
  });

  test("counts Korean words", () => {
    const result = getReadingTime("블로그 게시물 콘텐츠가 여기에 들어갑니다.");

    expect(result.words.en).toBe(0);
    expect(result.words.ko).toBe(5);
  });

  test("combines English and Korean", () => {
    const result = getReadingTime(
      `Lorem ipsum a b c.
       블로그 게시물 콘텐츠가 여기에 들어갑니다.`,
    );

    expect(result.words).toEqual({
      en: 5,
      ko: 5,
    });
  });

  test("calculates language-specific reading time", () => {
    const result = getReadingTime(
      `Lorem ipsum a b c.
       블로그 게시물 콘텐츠가 여기에 들어갑니다.`,
    );

    expect(result.minutes).toBeGreaterThanOrEqual(5 / 180 + 5 / 100);
  });

  test("supports custom reading speeds", () => {
    const result = getReadingTime("one two 세 개", {
      en: 100,
      ko: 50,
    });

    expect(result.words).toEqual({
      en: 2,
      ko: 2,
    });

    expect(result.minutes).toBeGreaterThanOrEqual(2 / 100 + 2 / 50);
  });

  test("ignores whitespace and punctuation", () => {
    const result = getReadingTime(
      `Hello , world !
       안녕하세요 , 세계 !`,
    );

    expect(result.words).toEqual({
      en: 2,
      ko: 2,
    });
  });

  test("returns zero for empty text", () => {
    expect(getReadingTime("")).toEqual({
      words: {
        en: 0,
        ko: 0,
      },
      minutes: 0,
    });
  });
});
