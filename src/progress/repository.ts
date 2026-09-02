import type { ProgressState } from "./types";
import { DEFAULT_SETTINGS, emptyCourseProgress } from "./types";

/**
 * Repozytorium postępu. Logika domenowa nie wie, czy dane leżą w localStorage,
 * czy przychodzą z API — zna wyłącznie ten interfejs.
 *
 * ⬇ BACKEND PODŁĄCZASZ TUTAJ: napisz `HttpProgressRepository implements
 * ProgressRepository` (GET/PUT /api/progress) i podmień eksport na dole pliku.
 */
export interface ProgressRepository {
  load(): Promise<ProgressState>;
  save(state: ProgressState): Promise<void>;
  clear(): Promise<void>;
}

export const STORAGE_KEY = "lexodromia.progress.v2";
const LEGACY_KEY = "bura.progress.v1";
const LEGACY_BEST = "bura-best";
export const CURRENT_VERSION = 2;
const LEGACY_COURSE = "pl-hr";

export function emptyProgress(): ProgressState {
  return {
    version: CURRENT_VERSION,
    courses: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

export class LocalProgressRepository implements ProgressRepository {
  constructor(private key = STORAGE_KEY) {}

  async load(): Promise<ProgressState> {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return normalize(JSON.parse(raw) as Partial<ProgressState>);
      return migrateLegacy();
    } catch {
      return emptyProgress();
    }
  }

  async save(state: ProgressState): Promise<void> {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      /* brak miejsca albo tryb prywatny — gra działa dalej, tylko bez zapisu */
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* noop */
    }
  }
}

function normalize(parsed: Partial<ProgressState>): ProgressState {
  const base = emptyProgress();
  const courses: ProgressState["courses"] = {};
  for (const [id, cp] of Object.entries(parsed.courses ?? {})) {
    courses[id] = { ...emptyCourseProgress(), ...cp };
  }
  return {
    ...base,
    ...parsed,
    version: CURRENT_VERSION,
    courses,
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
  };
}

/**
 * Przeniesienie danych z wersji sprzed kursów (klucz bura.progress.v1) oraz
 * z pierwszej, jednoplikowej Bury (bura-best). Uruchamia się raz — po pierwszym
 * zapisie istnieje już klucz v2.
 */
function migrateLegacy(): ProgressState {
  const state = emptyProgress();
  const course = emptyCourseProgress();
  let touched = false;

  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const old = JSON.parse(raw) as {
        words?: Record<string, { attempts: number; correct: number; misses: number; lastSeen: number; flagged?: boolean }>;
        games?: Record<string, { bestScore: number; bestStreak: number; rounds: number }>;
        activeDays?: string[];
        totalCorrect?: number;
        totalAttempts?: number;
        settings?: Partial<ProgressState["settings"]>;
      };

      for (const [croatian, w] of Object.entries(old.words ?? {})) {
        // Stary klucz to samo słowo docelowe; nowy to `${courseId}:${rank}`.
        // Rank nie jest znany bez datasetu, więc zachowujemy zapis pod starym
        // kluczem — serwis dopasuje go przy pierwszym kontakcie ze słowem.
        course.words[`legacy:${croatian}`] = {
          attempts: w.attempts ?? 0,
          correctAnswers: w.correct ?? 0,
          incorrectAnswers: Math.max(0, (w.attempts ?? 0) - (w.correct ?? 0)),
          lastSeen: w.lastSeen ?? 0,
          lastCorrect: 0,
          currentStreak: w.misses ? 0 : (w.correct ?? 0),
          difficulty: Math.min(1, (w.misses ?? 0) / 3),
          markedDifficult: Boolean(w.flagged),
        };
      }
      course.games = old.games ?? {};
      course.activeDays = old.activeDays ?? [];
      course.totalCorrect = old.totalCorrect ?? 0;
      course.totalAttempts = old.totalAttempts ?? 0;
      if (old.settings) state.settings = { ...state.settings, ...old.settings };
      touched = true;
    }

    const best = Number(localStorage.getItem(LEGACY_BEST) || 0);
    if (best > 0) {
      const prev = course.games.bura ?? { bestScore: 0, bestStreak: 0, rounds: 0 };
      course.games.bura = { ...prev, bestScore: Math.max(prev.bestScore, best) };
      touched = true;
    }
  } catch {
    /* uszkodzone dane starej wersji — startujemy czysto */
  }

  if (touched) state.courses[LEGACY_COURSE] = course;
  return state;
}

export const progressRepository: ProgressRepository = new LocalProgressRepository();
