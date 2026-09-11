import type { VocabularyEntry } from "@/vocabulary/types";
import type { Verdict } from "@/services/validation";
import type {
  ActivityRef,
  CourseProgress,
  FormProgress,
  JourneyProgress,
  ProgressState,
  WordProgress,
} from "./types";
import { emptyCourseProgress, emptyWordProgress } from "./types";
import { todayKey } from "@/utils/date";

export const LEARNED_THRESHOLD = 3;
export const DIFFICULT_THRESHOLD = 2;

export interface AnsweredWord {
  entry: VocabularyEntry;
  verdict: Verdict;
}

export interface RoundResult {
  gameId: string;
  courseId: string;
  score?: number;
  bestStreak?: number;
  answered: AnsweredWord[];
  activity?: ActivityRef;
}

export function courseProgress(state: ProgressState, courseId: string): CourseProgress {
  return state.courses[courseId] ?? emptyCourseProgress();
}

/**
 * Postęp słowa. Sięga też po klucz ze starej wersji (sprzed identyfikatorów
 * kursowych), żeby nikt nie stracił historii po aktualizacji.
 */
export function statFor(
  state: ProgressState,
  courseId: string,
  entry: VocabularyEntry,
): WordProgress {
  const words = courseProgress(state, courseId).words;
  return words[entry.id] ?? words[`legacy:${entry.targetText}`] ?? emptyWordProgress();
}

export function isLearned(w: WordProgress): boolean {
  return w.reviewStatus ? w.reviewStatus === "MASTERED" : w.currentStreak >= LEARNED_THRESHOLD;
}

export function isDifficult(w: WordProgress): boolean {
  return w.markedDifficult || (w.reviewStatus ? w.difficulty > 0 : w.incorrectAnswers >= DIFFICULT_THRESHOLD);
}

/** Do powtórki: ostatnia próba była nieudana. */
export function needsReview(w: WordProgress): boolean {
  return w.reviewStatus ? (w.nextReview ?? Infinity) <= Date.now() : w.attempts > 0 && w.currentStreak === 0;
}

const scored = (v: Verdict) => v === "hit" || v === "near";

/**
 * Aktualizacja postępu po rundzie dowolnej gry. To jedyne wejście do zapisu —
 * Bura, Trasa i przyszłe Fiszki wołają dokładnie to samo.
 *
 * Local guest statistics and game scores only. Authenticated material state
 * is supplied by the backend FSRS snapshot in ProgressProvider.
 */
export function applyRound(state: ProgressState, result: RoundResult): ProgressState {
  const cp = { ...courseProgress(state, result.courseId) };
  const words = { ...cp.words };
  const now = Date.now();

  for (const { entry, verdict } of result.answered) {
    const prev = words[entry.id] ?? words[`legacy:${entry.targetText}`] ?? emptyWordProgress();
    const ok = scored(verdict);
    const attempts = prev.attempts + 1;
    const incorrect = prev.incorrectAnswers + (ok ? 0 : 1);

    const next: WordProgress = {
      ...prev,
      attempts,
      correctAnswers: prev.correctAnswers + (ok ? 1 : 0),
      incorrectAnswers: incorrect,
      lastSeen: now,
      lastCorrect: ok ? now : prev.lastCorrect,
      currentStreak: ok ? prev.currentStreak + 1 : 0,
      difficulty: attempts ? Math.min(1, incorrect / attempts) : 0,
    };

    words[entry.id] = next;
    delete words[`legacy:${entry.targetText}`];

    cp.totalAttempts += 1;
    if (ok) cp.totalCorrect += 1;
  }

  cp.words = words;

  if (result.score !== undefined) {
    const prev = cp.games[result.gameId] ?? { bestScore: 0, bestStreak: 0, rounds: 0 };
    cp.games = {
      ...cp.games,
      [result.gameId]: {
        bestScore: Math.max(prev.bestScore, result.score),
        bestStreak: Math.max(prev.bestStreak, result.bestStreak ?? 0),
        rounds: prev.rounds + 1,
      },
    };
  }

  const today = todayKey();
  if (!cp.activeDays.includes(today)) cp.activeDays = [...cp.activeDays, today];
  if (result.activity) cp.lastActivity = result.activity;

  return { ...state, courses: { ...state.courses, [result.courseId]: cp } };
}

/* ---------- Gramatyka: postęp per forma (czasownik + osoba) ---------- */

export interface AnsweredForm {
  /** Klucz `${verbId}:${person}`. */
  key: string;
  verbId: string;
  person: string;
  /** Etykieta do statystyk, np. „ići — oni". */
  label: string;
  verdict: Verdict;
}

export interface GrammarRoundResult {
  gameId: string;
  courseId: string;
  score?: number;
  bestStreak?: number;
  answered: AnsweredForm[];
  activity?: ActivityRef;
}

export function emptyFormProgress(form: {
  verbId: string;
  person: string;
  label: string;
}): FormProgress {
  return { ...emptyWordProgress(), ...form };
}

export function formStatFor(
  state: ProgressState,
  courseId: string,
  form: { key: string; verbId: string; person: string; label: string },
): FormProgress {
  return courseProgress(state, courseId).forms[form.key] ?? emptyFormProgress(form);
}

/**
 * Zapis rundy gry gramatycznej. Świadomie NIE dotyka `words` — słowo z talii i
 * forma odmiany to dwie różne rzeczy do nauki. Reszta (dni aktywne, rekordy gry,
 * licznik prób) leci wspólnym kanałem, więc Statystyki i Pulpit widzą Odmianę
 * od razu.
 *
 * ⬇ SRS PODŁĄCZASZ TUTAJ — dokładnie tak samo jak w `applyRound`.
 */
export function applyGrammarRound(
  state: ProgressState,
  result: GrammarRoundResult,
): ProgressState {
  const cp = { ...courseProgress(state, result.courseId) };
  const forms = { ...cp.forms };
  const now = Date.now();

  for (const answer of result.answered) {
    const prev = forms[answer.key] ?? emptyFormProgress(answer);
    const ok = scored(answer.verdict);
    const attempts = prev.attempts + 1;
    const incorrect = prev.incorrectAnswers + (ok ? 0 : 1);

    forms[answer.key] = {
      ...prev,
      verbId: answer.verbId,
      person: answer.person,
      label: answer.label,
      attempts,
      correctAnswers: prev.correctAnswers + (ok ? 1 : 0),
      incorrectAnswers: incorrect,
      lastSeen: now,
      lastCorrect: ok ? now : prev.lastCorrect,
      currentStreak: ok ? prev.currentStreak + 1 : 0,
      difficulty: attempts ? Math.min(1, incorrect / attempts) : 0,
    };

    cp.totalAttempts += 1;
    if (ok) cp.totalCorrect += 1;
  }

  cp.forms = forms;

  if (result.score !== undefined) {
    const prev = cp.games[result.gameId] ?? { bestScore: 0, bestStreak: 0, rounds: 0 };
    cp.games = {
      ...cp.games,
      [result.gameId]: {
        bestScore: Math.max(prev.bestScore, result.score),
        bestStreak: Math.max(prev.bestStreak, result.bestStreak ?? 0),
        rounds: prev.rounds + 1,
      },
    };
  }

  const today = todayKey();
  if (!cp.activeDays.includes(today)) cp.activeDays = [...cp.activeDays, today];
  if (result.activity) cp.lastActivity = result.activity;

  return { ...state, courses: { ...state.courses, [result.courseId]: cp } };
}

/** Formy do powtórki: ostatnia próba nieudana. Czyta to Powtórki i Dzisiejszy trening. */
export function formsToReview(state: ProgressState, courseId: string): FormProgress[] {
  return Object.values(courseProgress(state, courseId).forms)
    .filter((f) => needsReview(f))
    .sort((a, b) => b.difficulty - a.difficulty || b.lastSeen - a.lastSeen);
}

export function setJourney(
  state: ProgressState,
  courseId: string,
  routeId: string,
  journey: JourneyProgress,
): ProgressState {
  const cp = { ...courseProgress(state, courseId) };
  cp.journeys = { ...cp.journeys, [routeId]: journey };
  return { ...state, courses: { ...state.courses, [courseId]: cp } };
}

export interface ProgressSummary {
  learned: number;
  review: number;
  difficult: number;
  seen: number;
  accuracy: number;
}

export function summarize(state: ProgressState, courseId: string): ProgressSummary {
  const cp = courseProgress(state, courseId);
  const stats = Object.values(cp.words);
  return {
    learned: stats.filter(isLearned).length,
    review: stats.filter(needsReview).length,
    difficult: stats.filter(isDifficult).length,
    seen: stats.length,
    accuracy: cp.totalAttempts ? Math.round((cp.totalCorrect / cp.totalAttempts) * 100) : 0,
  };
}

export function masteryOf(
  state: ProgressState,
  courseId: string,
  entries: readonly VocabularyEntry[],
): number {
  if (entries.length === 0) return 0;
  const learned = entries.filter((e) => isLearned(statFor(state, courseId, e))).length;
  return Math.round((learned / entries.length) * 100);
}
