import { isScored, isValidResult, type StepResult } from "./grading";
import type { LessonStep } from "./types";

/**
 * Wznawianie lekcji po odświeżeniu: bieżący krok i wyniki ćwiczeń, osobno dla
 * każdego profilu (id użytkownika albo „guest”), kursu i lekcji.
 *
 * Odczyt jest ostrożny — zapis to dane z localStorage, które mogły się zestarzeć
 * (nowa wersja lekcji) albo zostać zmienione:
 * - wyniki zostają tylko dla kroków, które nadal istnieją i mają ten sam typ i liczbę pytań,
 * - wznawiamy najpóźniej na pierwszym ćwiczeniu bez wyniku — nie da się „przeskoczyć”
 *   do podsumowania, omijając zadania,
 * - nieczytelny zapis = start od początku.
 */

const SESSION_KEY = "lexodromia.curriculum.session.v1";

export interface SavedLessonSession {
  v: 1;
  /** Podpis struktury lekcji (id i typy kroków) z chwili zapisu. */
  signature: string;
  stepId: string;
  results: Record<string, StepResult>;
  savedAt: number;
}

export interface RestoredLessonSession {
  index: number;
  results: Record<string, StepResult>;
  /** Lekcja zmieniła się od zapisu — część postępu mogła przepaść. */
  changed: boolean;
  /** Zapis pochodzi z podsumowania (koniec lekcji). */
  finished: boolean;
}

export const sessionKey = (owner: string, courseId: string, lessonId: string) => `${SESSION_KEY}.${owner}.${courseId}.${lessonId}`;

export function lessonSignature(steps: readonly LessonStep[]): string {
  const text = steps.map((step) => `${step.id}:${step.type}`).join("|");
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return `${steps.length}-${hash.toString(36)}`;
}

/** Zwraca null, gdy nie ma czego wznawiać (brak zapisu, zapis pusty albo nieczytelny). */
export function restoreLessonSession(key: string, steps: readonly LessonStep[]): RestoredLessonSession | null {
  let saved: Partial<SavedLessonSession> | null = null;
  try {
    const raw = localStorage.getItem(key);
    saved = raw ? (JSON.parse(raw) as Partial<SavedLessonSession>) : null;
  } catch {
    saved = null;
  }
  if (!saved || saved.v !== 1 || typeof saved.stepId !== "string") return null;

  const results: Record<string, StepResult> = {};
  const raw = saved.results && typeof saved.results === "object" ? saved.results : {};
  for (const step of steps) {
    const result = (raw as Record<string, unknown>)[step.id];
    if (isValidResult(step, result)) results[step.id] = { correct: result.correct, total: result.total, ...(result.fixed ? { fixed: result.fixed } : {}) };
  }

  const savedIndex = steps.findIndex((step) => step.id === saved!.stepId);
  const firstOpen = steps.findIndex((step) => isScored(step) && !results[step.id]);
  let index = savedIndex < 0 ? 0 : savedIndex;
  if (firstOpen >= 0) index = Math.min(index, firstOpen);
  const changed = saved.signature !== lessonSignature(steps) || savedIndex < 0;
  const finished = savedIndex === steps.length - 1;
  if (index === 0 && !Object.keys(results).length && !finished) return null;
  return { index, results, changed, finished };
}

export function saveLessonSession(key: string, steps: readonly LessonStep[], index: number, results: Record<string, StepResult>): void {
  const step = steps[index];
  if (!step) return;
  const value: SavedLessonSession = { v: 1, signature: lessonSignature(steps), stepId: step.id, results, savedAt: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Brak storage — lekcja działa, tylko bez wznawiania.
  }
}

export function clearLessonSession(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}
