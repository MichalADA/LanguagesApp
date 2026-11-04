import type { ChoiceStep, CourseModule, CourseOutline, GapStep, LessonContent, TranslateStep } from "./types";

/**
 * Test poziomujący — adaptacyjny (CAT, computerized adaptive testing).
 *
 * Model
 *   Poziom ucznia to h ∈ {0, …, M}: „pierwsze h modułów kursu już umiem” (M = liczba modułów,
 *   h = M — umiem cały kurs). Każde zadanie pochodzi z modułu m (0…M−1), więc ma trudność m.
 *   Prawdopodobieństwo poprawnej odpowiedzi to model IRT z trzema parametrami (3PL) na dyskretnej skali:
 *
 *     P(dobrze | h, m) = g + (1 − g − s) · σ(a · (h − m − ½))
 *
 *   g — szansa zgadnięcia (1/liczba opcji przy wyborze, ~2% przy wpisywaniu),
 *   s — poślizg (pomyłka mimo wiedzy), a — jak ostro rośnie wiedza na granicy modułów.
 *
 * Algorytm
 *   1. Start: rozkład a priori na h (lekko malejący — początkujących jest więcej).
 *   2. Wybór zadania: spośród (moduł × rodzaj zadania) to, po którym oczekiwana entropia rozkładu
 *      jest najmniejsza (maksymalny przyrost informacji). Zwykle wypada na środek obecnej niepewności,
 *      więc test zachowuje się jak „miękkie” wyszukiwanie binarne odporne na pomyłki i zgadywanie.
 *   3. Aktualizacja: reguła Bayesa po każdej odpowiedzi.
 *   4. Stop: gdy ≥ STOP_CONFIDENCE prawdopodobieństwa mieści się w oknie ±1 moduł wokół mediany
 *      (po co najmniej MIN_QUESTIONS zadaniach) albo po MAX_QUESTIONS.
 *   5. Wynik: mediana rozkładu = moduł, od którego zaczynasz. Wszystkie wcześniejsze lekcje → ukończone.
 */

export type PlacementQuestion = ChoiceStep | GapStep | TranslateStep;
export type ItemKind = "choice" | "typed";

export const MIN_QUESTIONS = 10;
export const MAX_QUESTIONS = 24;
export const STOP_CONFIDENCE = 0.9;
/** Ostrość przejścia „umiem / nie umiem” na granicy modułu. */
const DISCRIMINATION = 2.2;
const SLIP = { choice: 0.08, typed: 0.15 } as const;
const TYPED_GUESS = 0.02;

export interface PlacementModule {
  module: CourseModule;
  levelId: string;
}

/** Moduły całego kursu w kolejności nauki (tylko poziomy z treścią). */
export function placementModules(outline: CourseOutline): PlacementModule[] {
  return outline.levels
    .filter((level) => level.available && level.modules.length)
    .flatMap((level) => level.modules.map((module) => ({ module, levelId: level.id })));
}

/** Lekcje do oznaczenia jako ukończone: wszystkie z modułów przed wynikiem. */
export function placementLessons(passed: readonly PlacementModule[]): string[] {
  return passed.flatMap((item) => item.module.lessons.map((lesson) => lesson.id));
}

/* ---------------- Pula zadań modułu ---------------- */

export interface ModulePool {
  choice: ChoiceStep[];
  typed: (GapStep | TranslateStep)[];
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Zadania z lekcji modułu (bez testów poziomu i zadań dodatkowych), przetasowane. */
export function modulePool(contents: readonly (LessonContent | null)[], random: () => number = Math.random): ModulePool {
  const steps = contents.flatMap((content) => (content && content.mode !== "test" ? content.steps : [])).filter((step) => !step.optional);
  return {
    choice: shuffle(steps.filter((step): step is ChoiceStep => step.type === "choice" && step.options.length > 1), random),
    // Luki przed tłumaczeniami: krótsze i jednoznaczne.
    typed: [
      ...shuffle(steps.filter((step): step is GapStep => step.type === "gap"), random),
      ...shuffle(steps.filter((step): step is TranslateStep => step.type === "translate"), random),
    ],
  };
}

/* ---------------- Model i estymacja ---------------- */

export interface Item {
  module: number;
  kind: ItemKind;
  /** Liczba opcji (tylko wybór) — od niej zależy szansa zgadnięcia. */
  options?: number;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function pCorrect(h: number, item: Item): number {
  const guess = item.kind === "choice" ? 1 / Math.max(2, item.options ?? 3) : TYPED_GUESS;
  const slip = SLIP[item.kind];
  return guess + (1 - guess - slip) * sigmoid(DISCRIMINATION * (h - item.module - 0.5));
}

/** Rozkład a priori: lekko malejący (waga 1 → 0,5), bo częściej test robią początkujący. */
export function initialPosterior(modules: number): number[] {
  const raw = Array.from({ length: modules + 1 }, (_, h) => 1 - (0.5 * h) / Math.max(1, modules));
  return normalize(raw);
}

function normalize(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  return values.map((value) => value / sum);
}

export function update(posterior: readonly number[], item: Item, correct: boolean): number[] {
  return normalize(posterior.map((p, h) => p * (correct ? pCorrect(h, item) : 1 - pCorrect(h, item))));
}

export function entropy(posterior: readonly number[]): number {
  return -posterior.reduce((sum, p) => (p > 0 ? sum + p * Math.log2(p) : sum), 0);
}

/** Oczekiwana entropia po odpowiedzi na zadanie (średnia po „dobrze” i „źle”). */
export function expectedEntropy(posterior: readonly number[], item: Item): number {
  const pYes = posterior.reduce((sum, p, h) => sum + p * pCorrect(h, item), 0);
  return pYes * entropy(update(posterior, item, true)) + (1 - pYes) * entropy(update(posterior, item, false));
}

/** Zadanie o największym przyroście informacji spośród dostępnych. */
export function chooseItem(posterior: readonly number[], candidates: readonly Item[]): Item | null {
  let best: Item | null = null;
  let bestScore = Infinity;
  for (const item of candidates) {
    const score = expectedEntropy(posterior, item);
    if (score < bestScore - 1e-9) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

export interface Estimate {
  /** Moduł startowy (0…M): mediana rozkładu. */
  start: number;
  /** Prawdopodobieństwo, że prawdziwy poziom jest w oknie start ± 1. */
  confidence: number;
  /** Przedział 80% (10. i 90. percentyl). */
  low: number;
  high: number;
}

function quantile(posterior: readonly number[], q: number): number {
  let sum = 0;
  for (let h = 0; h < posterior.length; h += 1) {
    sum += posterior[h];
    if (sum >= q - 1e-12) return h;
  }
  return posterior.length - 1;
}

export function estimate(posterior: readonly number[]): Estimate {
  const start = quantile(posterior, 0.5);
  const confidence = posterior.slice(Math.max(0, start - 1), start + 2).reduce((a, b) => a + b, 0);
  return { start, confidence, low: quantile(posterior, 0.1), high: quantile(posterior, 0.9) };
}

export function shouldStop(posterior: readonly number[], asked: number): boolean {
  if (asked >= MAX_QUESTIONS) return true;
  return asked >= MIN_QUESTIONS && estimate(posterior).confidence >= STOP_CONFIDENCE;
}
