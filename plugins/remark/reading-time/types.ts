export type ReadingLanguage = "en" | "ko";

export interface ReadingTimeOptions {
  /**
   * Words per minute.
   *
   * Conservative defaults for technical blog content.
   */
  speed?: Partial<Record<ReadingLanguage, number>>;
}

export interface ReadingStatistics {
  words: Record<ReadingLanguage, number>;
  minutes: number;
}
