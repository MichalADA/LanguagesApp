import type { UiLocale } from "@/i18n/types";
import type { LearningLevelId } from "@/config/learningLevels";

/**
 * Postęp pojedynczego słowa w obrębie jednego kursu.
 * Wszystkie gry aktualizują TEN SAM obiekt — Bura, Trasa, a w przyszłości
 * Fiszki i Listening.
 */
export interface WordProgress {
  attempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  lastSeen: number;
  lastCorrect: number;
  /** Kolejne trafienia z rzędu. Zeruje się przy pomyłce. */
  currentStreak: number;
  /** 0 = łatwe, 1 = bardzo trudne. Liczone z historii, nie wpisywane ręcznie. */
  difficulty: number;
  /** Gwiazdka postawiona przez użytkownika. */
  markedDifficult: boolean;

  /* --- Miejsce pod SRS. Dziś nikt tego nie zapisuje ani nie czyta. --- */
  nextReview?: number;
  interval?: number;
  stability?: number;
  reviewCount?: number;
}

/**
 * Postęp pojedynczej FORMY gramatycznej — czasownik + osoba. Ta sama struktura
 * co WordProgress (żeby SRS i statystyki liczyły to jednym kodem), plus dwa
 * pola pozwalające grupować dane bez wczytywania datasetu.
 */
export interface FormProgress extends WordProgress {
  verbId: string;
  person: string;
  /** Bezokolicznik i osoba w postaci gotowej do wyświetlenia w Statystykach. */
  label: string;
}

export interface GameRecord {
  bestScore: number;
  bestStreak: number;
  rounds: number;
}

/** Stan podróży w grze Trasa — trzymany per trasa. */
export interface JourneyProgress {
  stopIndex: number;
  answersInLeg: number;
  correct: number;
  incorrect: number;
  completedAt?: number;
}

export interface PoolSelection {
  source: PoolSource;
  topic: string | null;
}

export type PoolSource =
  | { kind: "all" }
  | { kind: "level"; level: LearningLevelId }
  /** Zachowane dla kompatybilności ze starszym postępem zapisanym w localStorage. */
  | { kind: "block"; block: string }
  | { kind: "learned" }
  | { kind: "difficult" }
  | { kind: "mistakes" };

export interface ActivityRef {
  gameId: string;
  pool: PoolSelection;
  at: number;
}

/** Wszystko, co wiemy o użytkowniku w obrębie jednego kursu. */
export interface CourseProgress {
  words: Record<string, WordProgress>;
  /** Klucz: `${verbId}:${person}`. Wypełnia to gra Odmiana. */
  forms: Record<string, FormProgress>;
  games: Record<string, GameRecord>;
  journeys: Record<string, JourneyProgress>;
  activeDays: string[];
  totalCorrect: number;
  totalAttempts: number;
  lastActivity: ActivityRef | null;
}

export interface GameplaySettings {
  timeLimit: number;
  lives: number;
  roundLength: number;
  lenientDiacritics: boolean;
}

export interface ProgressState {
  version: number;
  /** Postęp jest zawsze per kurs — dodanie drugiego kursu nic nie miesza. */
  courses: Record<string, CourseProgress>;
  settings: GameplaySettings;
  /** Zapisywane tylko po to, żeby eksport JSON był kompletny. */
  uiLocale?: UiLocale;
}

export const DEFAULT_SETTINGS: GameplaySettings = {
  timeLimit: 13,
  lives: 3,
  roundLength: 20,
  lenientDiacritics: true,
};

export function emptyWordProgress(): WordProgress {
  return {
    attempts: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    lastSeen: 0,
    lastCorrect: 0,
    currentStreak: 0,
    difficulty: 0,
    markedDifficult: false,
  };
}

export function emptyCourseProgress(): CourseProgress {
  return {
    words: {},
    forms: {},
    games: {},
    journeys: {},
    activeDays: [],
    totalCorrect: 0,
    totalAttempts: 0,
    lastActivity: null,
  };
}
