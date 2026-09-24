import { canonical, foldDiacritics, type Verdict } from "@/services/validation";
import type { ValidationRules } from "@/courses/types";

/** Końcowa interpunkcja nie zmienia sensu odpowiedzi w ćwiczeniach kursu. */
const stripPunctuation = (value: string) => value.replace(/[.!?,;:]+$/g, "").replace(/\s+([.!?,;:])/g, "$1");

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
  if (!input.trim()) return "miss";
  const canon = (value: string) => stripPunctuation(canonical(value, rules));
  const fold = (value: string) => foldDiacritics(canon(value), rules);
  const answer = canon(input);
  const regex = pattern ? new RegExp(pattern, "u") : null;

  if (accepted.some((item) => canon(item) === answer) || regex?.test(answer)) return "hit";
  if (rules.diacriticsMatter) {
    const folded = fold(input);
    if (accepted.some((item) => fold(item) === folded)) return "near";
    if (regex && new RegExp(foldDiacritics(pattern!, rules), "u").test(folded)) return "near";
  }
  return "miss";
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
