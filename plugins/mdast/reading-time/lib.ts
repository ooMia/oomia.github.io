import type { ReadingLanguage, ReadingSpeed, ReadingStatistics, ReadingWords } from "./types";

const DEFAULT_SPEED: Record<ReadingLanguage, number> = {
  en: 180,
  ko: 100,
};

const wordSegmenter = new Intl.Segmenter("ko-KR", {
  granularity: "word",
});

const LANGUAGE_PATTERNS = {
  ko: /\p{Script=Hangul}/u,
  en: /\p{Script=Latin}/u,
} satisfies Record<ReadingLanguage, RegExp>;

function createReadingWords(): ReadingWords {
  return {
    en: 0,
    ko: 0,
  };
}

function detectLanguage(word: string): ReadingLanguage | undefined {
  for (const language of Object.keys(LANGUAGE_PATTERNS) as ReadingLanguage[]) {
    if (LANGUAGE_PATTERNS[language].test(word)) {
      return language;
    }
  }

  return undefined;
}

function countWords(text: string): ReadingWords {
  const words = createReadingWords();

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

function calculateReadingTime(words: ReadingWords, speed: ReadingSpeed): number {
  return words.en / speed.en + words.ko / speed.ko;
}

export default function getReadingTime(
  statistics: Partial<ReadingStatistics> = {
    words: {
      en: 0,
      ko: 0,
    },
  },
  text: string,
  speed: ReadingSpeed = { ...DEFAULT_SPEED },
): ReadingStatistics {
  const current = countWords(text);
  const words = statistics.words!;

  words.en += current.en;
  words.ko += current.ko;

  return {
    words,
    minutes: calculateReadingTime(words, speed),
  };
}
