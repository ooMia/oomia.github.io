import type { ReadingLanguage, ReadingStatistics, ReadingTimeOptions } from "./types";

const DEFAULT_SPEED: Record<ReadingLanguage, number> = {
  en: 180,
  ko: 100,
};

const wordSegmenter = new Intl.Segmenter("ko-KR", {
  granularity: "word",
});

function detectLanguage(word: string): ReadingLanguage | undefined {
  const KOREAN_SCRIPT = /\p{Script=Hangul}/u;
  if (KOREAN_SCRIPT.test(word)) {
    return "ko";
  }

  const LATIN_SCRIPT = /\p{Script=Latin}/u;
  if (LATIN_SCRIPT.test(word)) {
    return "en";
  }

  return undefined;
}

export default function getReadingTime(text: string, options: ReadingTimeOptions = {}): ReadingStatistics {
  const speed = {
    ...DEFAULT_SPEED,
    ...options.speed,
  };
  const words: Record<ReadingLanguage, number> = {
    en: 0,
    ko: 0,
  };

  for (const segment of wordSegmenter.segment(text)) {
    if (!segment.isWordLike) {
      continue;
    }
    const language = detectLanguage(segment.segment);
    if (language) {
      words[language]++;
    }
  }

  const minutes = Math.ceil(words.en / speed.en + words.ko / speed.ko);
  return {
    words,
    minutes,
  };
}
