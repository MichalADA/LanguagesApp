/**
 * Neutralny model słowa. Żaden komponent nie wie, że dataset nazywa kolumny
 * „Polish" i „Croatian" — mapowanie robi adapter na podstawie konfiguracji kursu.
 */
export interface VocabularyEntry {
  /** Stabilny identyfikator: `${courseId}:${rank}`. */
  id: string;
  courseId: string;
  rank: number;
  sourceText: string;
  targetText: string;
  /** Jawne warianty odpowiedzi; pusta lista wyłącza odczytywanie opisów gramatycznych. */
  acceptedAnswers?: string[];
  partOfSpeech: string;
  grammar: string;
  exampleTarget: string;
  exampleSource: string;
  falseFriend: boolean;
  falseFriendNote: string;
  tags: string[];
  /** Tag bloku nauki wyciągnięty z tags. */
  block: string;
  /** Nagranie native speakera. Dziś zawsze puste — model jest gotowy. */
  audioUrl?: string;
  /**
   * Status materiału. Dziś wszystko jest "generated"; docelowo native speakerzy
   * będą podnosić wpisy do "reviewed" / "verified".
   */
  contentStatus?: ContentStatus;
  reviewedBy?: string;
  reviewedAt?: number;
}

export type ContentStatus = "generated" | "reviewed" | "verified";
