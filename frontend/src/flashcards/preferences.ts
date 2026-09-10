import type { FlashcardDirection, FlashcardMode } from "./types";

/**
 * Per-viewer flashcard preferences. Stored in localStorage because it's UX
 * chrome (session size, preferred direction) rather than progress data —
 * those live in the backend.
 */
export interface FlashcardPreferences {
  sessionSize: number;
  direction: FlashcardDirection;
  mode: FlashcardMode;
  strictDiacritics: boolean;
}

export const DEFAULT_PREFERENCES: FlashcardPreferences = {
  sessionSize: 20,
  direction: "MIXED",
  mode: "MIXED",
  strictDiacritics: false,
};

const KEY = "lexodromia.flashcards.prefs";

export function readPreferences(): FlashcardPreferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<FlashcardPreferences>;
    return {
      sessionSize: clampSize(parsed.sessionSize),
      direction: normaliseDirection(parsed.direction),
      mode: normaliseMode(parsed.mode),
      strictDiacritics: parsed.strictDiacritics === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(next: FlashcardPreferences): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage may be blocked in private mode — the app must not crash.
  }
}

function clampSize(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_PREFERENCES.sessionSize;
  return Math.min(60, Math.max(5, Math.floor(value as number)));
}

function normaliseDirection(value: FlashcardDirection | undefined): FlashcardDirection {
  if (value === "SOURCE_TO_TARGET" || value === "TARGET_TO_SOURCE" || value === "MIXED") {
    return value;
  }
  return DEFAULT_PREFERENCES.direction;
}

function normaliseMode(value: FlashcardMode | undefined): FlashcardMode {
  if (value === "NEW" || value === "REVIEW" || value === "MIXED" || value === "DIFFICULT") {
    return value;
  }
  return DEFAULT_PREFERENCES.mode;
}
