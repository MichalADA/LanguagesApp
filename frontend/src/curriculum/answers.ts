import { canonical, foldDiacritics, type Verdict } from "@/services/validation";
import type { ValidationRules } from "@/courses/types";

/** Interpunkcja nie zmienia sensu odpowiedzi w ćwiczeniach kursu (Račun, molim = Račun molim). */
const stripPunctuation = (value: string) => value.replace(/[.!?,;:„”"«»…]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Sprawdza odpowiedź w ćwiczeniu kursu. Korzysta z reguł walidacji aktywnego
 * języka (te same, co gry), a dodatkowo:
 * - ignoruje końcową interpunkcję,
 * - akceptuje odpowiedzi pasujące do wzorca (np. dowolne miasto w „Živim u …”),
 * - odpowiedź różniąca się tylko znakami diakrytycznymi to „near”.
 */
export function checkLessonAnswer(
  input: string,
  accepted: readonly string[],
  rules: ValidationRules,
  pattern?: string,
): Verdict {
  return checkLessonAnswerDetailed(input, accepted, rules, pattern).verdict;
}

export interface LessonAnswerCheck {
  verdict: Verdict;
  /**
   * Wariant, do którego pasuje odpowiedź (przy „near” — poprawna pisownia tego,
   * co wpisał użytkownik). Null, gdy odpowiedź przeszła tylko przez wzorzec.
   */
  expected: string | null;
}

/**
 * Jak checkLessonAnswer, ale zwraca też wariant do pokazania w informacji zwrotnej.
 * Błędna gramatyka nie przechodzi: porównujemy całe zdanie z listą wariantów
 * albo ze wzorcem — ignorujemy tylko wielkość liter, interpunkcję i (jako „near”) diakrytykę.
 */
export function checkLessonAnswerDetailed(
  input: string,
  accepted: readonly string[],
  rules: ValidationRules,
  pattern?: string,
): LessonAnswerCheck {
  if (!input.trim()) return { verdict: "miss", expected: accepted[0] ?? null };
  const canon = (value: string) => stripPunctuation(canonical(value, rules));
  const fold = (value: string) => foldDiacritics(canon(value), rules);
  const answer = canon(input);
  const regex = pattern ? new RegExp(pattern, "u") : null;

  const exact = accepted.find((item) => canon(item) === answer);
  if (exact) return { verdict: "hit", expected: exact };
  if (regex?.test(answer)) return { verdict: "hit", expected: null };
  if (rules.diacriticsMatter) {
    const folded = fold(input);
    const near = accepted.find((item) => fold(item) === folded);
    if (near) return { verdict: "near", expected: near };
    if (regex && new RegExp(foldDiacritics(pattern!, rules), "u").test(folded)) return { verdict: "near", expected: null };
  }
  return { verdict: "miss", expected: accepted[0] ?? null };
}

export interface FreeResponseReview {
  sentences: number;
  found: string[];
  missing: string[];
}

/** Łagodna informacja zwrotna do swobodnej odpowiedzi — bez oceniania. */
export function reviewFreeResponse(
  text: string,
  keywords: readonly { any: string[]; label: string }[],
  rules: ValidationRules,
): FreeResponseReview {
  const sentences = text.split(/[.!?\n]+/).map((part) => part.trim()).filter((part) => part.split(/\s+/).length >= 2).length;
  const words = new Set(foldDiacritics(canonical(text, rules), rules).split(/[^\p{L}]+/u));
  const found: string[] = [];
  const missing: string[] = [];
  for (const keyword of keywords) {
    const hit = keyword.any.some((word) => words.has(foldDiacritics(canonical(word, rules), rules)));
    (hit ? found : missing).push(keyword.label);
  }
  return { sentences, found, missing };
}
