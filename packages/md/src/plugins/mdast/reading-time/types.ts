export const READING_LANGUAGES = ["en", "ko"] as const;

export type ReadingLanguage = (typeof READING_LANGUAGES)[number];

export type ReadingWords = Record<ReadingLanguage, number>;

export type ReadingSpeed = Record<ReadingLanguage, number>;

export interface ReadingStatistics {
  words: ReadingWords;
  minutes: number;
}
