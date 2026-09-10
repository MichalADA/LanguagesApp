export type WordStatus = 'NEW' | 'LEARNING' | 'REVIEW' | 'MASTERED' | 'DIFFICULT';
export type FlashcardMode = 'NEW' | 'REVIEW' | 'MIXED' | 'DIFFICULT';
export type FlashcardDirection = 'SOURCE_TO_TARGET' | 'TARGET_TO_SOURCE' | 'MIXED';
export type FlashcardRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

/** Per-card server state — mirror of Prisma UserWordProgress. */
export interface FlashcardProgress {
  wordRef: string;
  status: WordStatus;
  repetitions: number;
  correctAnswers: number;
  wrongAnswers: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  firstSeenAt: string;
  masteredAt: string | null;
  difficultyScore: number;
  markedDifficult: boolean;
  isDue: boolean;
  isNew: boolean;
}

export interface FlashcardsSummary {
  courseId: string;
  totalKnown: number;
  newToday: number;
  reviewDue: number;
  mastered: number;
  learning: number;
  difficult: number;
  seenTotal: number;
  currentStreak: number;
  longestStreak: number;
  attempts: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

export interface FlashcardSessionResponse {
  id: string;
  courseId: string;
  mode: FlashcardMode;
  direction: FlashcardDirection;
  startedAt: string;
  finishedAt: string | null;
  totalAnswers: number;
  correctAnswers: number;
  wrongAnswers: number;
  newWords: number;
}
