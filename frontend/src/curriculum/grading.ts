import { TEST_SECTIONS, type LessonStep, type TestSection } from "./types";

/**
 * Ocena lekcji. Bez AI — tylko wyniki ćwiczeń, które player już zna.
 *
 * Siła dowodu (waga zadania): rozpoznanie (wybór, pytania do tekstu i nagrania) = 1,
 * produkcja z podpowiedzią (luka, układanie zdania) = 2, samodzielne wpisanie zdania
 * (tłumaczenie, replika w dialogu) = 3. Trafny wybór z trzech opcji to słabszy dowód
 * niż napisanie zdania samodzielnie.
 *
 * Zaliczenie:
 * - lekcja ćwiczeniowa: ≥ 70% punktów; błąd poprawiony w rundzie „Przećwicz błędy”
 *   daje połowę punktu — da się zaliczyć, poprawiając błędy, ale nie samym klikaniem dalej;
 * - test poziomu: ≥ 70% punktów w pierwszym podejściu i ≥ 50% w każdej sekcji;
 *   poprawki z rundy błędów nie zmieniają wyniku testu (można go powtórzyć od nowa).
 * Ćwiczenie bez wyniku (np. po zmianie zapisanego stanu) liczy się jako 0 — nie da się
 * zaliczyć lekcji, omijając zadania.
 */

export const PASS_THRESHOLD = 0.7;
export const TEST_SECTION_THRESHOLD = 0.5;
/** Ile punktu daje błąd poprawiony w rundzie powtórki (tylko lekcje ćwiczeniowe). */
export const FIX_CREDIT = 0.5;

/** Wynik kroku: liczba poprawnych / wszystkich pytań w kroku i błędy poprawione później. */
export interface StepResult {
  correct: number;
  total: number;
  /** Błędy poprawione w rundzie „Przećwicz błędy” (≤ total − correct). */
  fixed?: number;
}

export type ScoredStep = Extract<LessonStep, { type: "choice" | "translate" | "gap" | "order" | "reading" | "listening" | "dialog" }>;

export const EVIDENCE_WEIGHT: Record<ScoredStep["type"], number> = {
  choice: 1,
  reading: 1,
  listening: 1,
  gap: 2,
  order: 2,
  translate: 3,
  dialog: 3,
};

export function isScored(step: LessonStep): step is ScoredStep {
  return step.type in EVIDENCE_WEIGHT;
}

/** Ile pytań ma krok (oczekiwane `total` wyniku). */
export function expectedTotal(step: ScoredStep): number {
  switch (step.type) {
    case "reading":
    case "listening":
      return step.questions.length;
    case "dialog":
      return step.turns.filter((turn) => turn.kind === "reply").length;
    default:
      return 1;
  }
}

/** Wynik pasuje do kroku (chroni przed starym lub zmienionym zapisem). */
export function isValidResult(step: LessonStep, result: unknown): result is StepResult {
  if (!isScored(step) || !result || typeof result !== "object") return false;
  const { correct, total, fixed = 0 } = result as StepResult;
  const ints = [correct, total, fixed].every((n) => Number.isInteger(n) && n >= 0);
  return ints && total === expectedTotal(step) && correct <= total && fixed <= total - correct;
}

export interface LessonEvaluation {
  mode: "lesson" | "test";
  /** Punkty ważone (0–1), z poprawkami w lekcjach ćwiczeniowych. */
  score: number;
  /** Punkty ważone w pierwszym podejściu (0–1). */
  firstTry: number;
  /** Liczba poprawnych odpowiedzi w pierwszym podejściu (bez wag) — do komunikatu. */
  correct: number;
  total: number;
  passed: boolean;
  /** Kroki z błędami, których jeszcze nie poprawiono. */
  mistakes: string[];
  /** Ćwiczenia bez wyniku. */
  unanswered: string[];
  /** Tylko test: wynik sekcji (bez wag, pierwsze podejście). */
  sections: Partial<Record<TestSection, { correct: number; total: number }>>;
  weakSections: TestSection[];
}

export function evaluateLesson(steps: readonly LessonStep[], results: Readonly<Record<string, StepResult>>, mode: "lesson" | "test" = "lesson"): LessonEvaluation {
  let points = 0;
  let firstPoints = 0;
  let max = 0;
  let correct = 0;
  let total = 0;
  const mistakes: string[] = [];
  const unanswered: string[] = [];
  const sections: LessonEvaluation["sections"] = {};

  for (const step of steps) {
    if (!isScored(step)) continue;
    const weight = EVIDENCE_WEIGHT[step.type];
    const expected = expectedTotal(step);
    const result = results[step.id];
    max += weight * expected;
    total += expected;
    if (!isValidResult(step, result)) {
      unanswered.push(step.id);
      continue;
    }
    const fixed = mode === "lesson" ? result.fixed ?? 0 : 0;
    firstPoints += weight * result.correct;
    points += weight * (result.correct + FIX_CREDIT * fixed);
    correct += result.correct;
    if (result.correct + (result.fixed ?? 0) < result.total) mistakes.push(step.id);
    if (step.section) {
      const prev = sections[step.section] ?? { correct: 0, total: 0 };
      sections[step.section] = { correct: prev.correct + result.correct, total: prev.total + result.total };
    }
  }

  const score = max ? points / max : 1;
  const firstTry = max ? firstPoints / max : 1;
  const weakSections = TEST_SECTIONS.filter((id) => {
    const s = sections[id];
    return s && s.total > 0 && s.correct / s.total < TEST_SECTION_THRESHOLD;
  });
  const passed =
    unanswered.length === 0 && (mode === "test" ? firstTry >= PASS_THRESHOLD && weakSections.length === 0 : score >= PASS_THRESHOLD);
  return { mode, score, firstTry, correct, total, passed, mistakes, unanswered, sections, weakSections };
}

/** Wynik ponownej próby w rundzie błędów → ile błędów z pierwszego podejścia poprawiono. */
export function applyRetry(first: StepResult, retry: { correct: number; total: number }): StepResult {
  const open = first.total - first.correct - (first.fixed ?? 0);
  const gained = Math.max(0, Math.min(open, retry.correct - first.correct - (first.fixed ?? 0)));
  return { ...first, fixed: (first.fixed ?? 0) + gained };
}
