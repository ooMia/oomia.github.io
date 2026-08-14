import { type ReadingLanguage, type ReadingSpeed, type ReadingStatistics, type ReadingWords } from "./types";
// reading-time.ts

const DEFAULT_READING_WORDS = {
  ko: 0,
  en: 0,
} as const satisfies ReadingWords;

const DEFAULT_READING_SPEED = {
  ko: 100,
  en: 180,
} as const satisfies ReadingSpeed;

const LANGUAGE_PATTERNS = {
  ko: /\p{Script=Hangul}/u,
  en: /\p{Script=Latin}/u,
} as const satisfies Record<ReadingLanguage, RegExp>;

const wordSegmenter = new Intl.Segmenter("ko-KR", {
  granularity: "word",
});

function detectLanguage(word: string): ReadingLanguage | undefined {
  for (const [language, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(word)) {
      return language as ReadingLanguage;
    }
  }

  return undefined;
}

/**
 * 텍스트에서 언어별 단어 수를 계산한다.
 */
function countWords(text: string): ReadingWords {
  const words = { ...DEFAULT_READING_WORDS };

  for (const segment of wordSegmenter.segment(text)) {
    if (!segment.isWordLike) {
      continue;
    }

    const language = detectLanguage(segment.segment);
    if (language) {
      words[language]++;
    }
  }
  return words;
}

/**
 * 언어별 단어 수를 기준으로 예상 독서 시간을 계산한다.
 */
function calculateReadingTime(words: ReadingWords, speed: ReadingSpeed = { ...DEFAULT_READING_SPEED }): number {
  return words.en / speed.en + words.ko / speed.ko;
}

/**
 * 텍스트에서 독서 통계를 계산한다.
 */
export default function getReadingTime(
  text: string,
  speed: ReadingSpeed = { ...DEFAULT_READING_SPEED },
): ReadingStatistics {
  const words = countWords(text);
  const minutes = calculateReadingTime(words, speed);

  return {
    words,
    minutes,
  };
}
