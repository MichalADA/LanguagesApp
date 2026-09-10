/**
 * Simplified SM-2 spaced-repetition scheduler.
 *
 * Ratings map to Anki-style quality:
 *   AGAIN (1)  – card was forgotten; reset the interval and re-show soon.
 *   HARD  (2)  – recalled with effort; short bump.
 *   GOOD  (3)  – standard schedule (nominal SM-2 progression).
 *   EASY  (4)  – confident recall; boost interval more aggressively.
 *
 * Contract: pure functions. Callers pass in the current state and get back
 * the next state — no time, DB, or randomness leaks in here so it's trivial
 * to unit-test and to reuse from a background job.
 */
export type FlashcardRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface SrsState {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
}

export interface SrsUpdate extends SrsState {
  /** Whether this rep should count as a correct answer for stats. */
  correct: boolean;
  /** Delay in milliseconds from "now" to the next review. */
  nextDelayMs: number;
}

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Interval (in days) after which we consider a card "mastered". */
export const MASTERY_INTERVAL_DAYS = 21;
/** Minimum successful repetitions before a card can be MASTERED. */
export const MASTERY_MIN_REPETITIONS = 4;
/** Threshold on difficultyScore that flips status to DIFFICULT. */
export const DIFFICULTY_THRESHOLD = 3;

export function scheduleNext(state: SrsState, rating: FlashcardRating): SrsUpdate {
  const previous: SrsState = {
    repetitions: Math.max(0, state.repetitions),
    easeFactor: clamp(state.easeFactor, MIN_EASE, MAX_EASE),
    intervalDays: Math.max(0, state.intervalDays),
  };

  if (rating === 'AGAIN') {
    // Reset. The card comes back inside the same session (~1 minute) and
    // gets a fresh 10-minute short window on the next real review.
    return {
      repetitions: 0,
      easeFactor: clamp(previous.easeFactor - 0.2, MIN_EASE, MAX_EASE),
      intervalDays: 0,
      correct: false,
      nextDelayMs: 60_000, // 1 minute — re-appears in the current session
    };
  }

  const nextReps = previous.repetitions + 1;
  let ease = previous.easeFactor;
  let intervalDays: number;
  let nextDelayMs: number;

  if (rating === 'HARD') {
    ease = clamp(previous.easeFactor - 0.15, MIN_EASE, MAX_EASE);
    if (nextReps === 1) {
      intervalDays = 0;
      nextDelayMs = 10 * 60_000; // 10 minutes
    } else if (nextReps === 2) {
      intervalDays = 1;
      nextDelayMs = 1 * DAY_MS;
    } else {
      intervalDays = Math.max(1, Math.round(previous.intervalDays * 1.2));
      nextDelayMs = intervalDays * DAY_MS;
    }
  } else if (rating === 'GOOD') {
    if (nextReps === 1) {
      intervalDays = 0;
      nextDelayMs = 30 * 60_000; // 30 minutes
    } else if (nextReps === 2) {
      intervalDays = 3;
      nextDelayMs = 3 * DAY_MS;
    } else {
      intervalDays = Math.max(1, Math.round(previous.intervalDays * ease));
      nextDelayMs = intervalDays * DAY_MS;
    }
  } else {
    // EASY
    ease = clamp(previous.easeFactor + 0.15, MIN_EASE, MAX_EASE);
    if (nextReps === 1) {
      intervalDays = 2;
      nextDelayMs = 2 * DAY_MS;
    } else if (nextReps === 2) {
      intervalDays = 6;
      nextDelayMs = 6 * DAY_MS;
    } else {
      intervalDays = Math.max(2, Math.round(previous.intervalDays * ease * 1.3));
      nextDelayMs = intervalDays * DAY_MS;
    }
  }

  return {
    repetitions: nextReps,
    easeFactor: ease,
    intervalDays,
    correct: true,
    nextDelayMs,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}
