import type { Course, ValidationRules } from "@/courses/types";
import type { VocabularyEntry } from "@/vocabulary/types";

export type Verdict = "hit" | "near" | "miss";

export interface AnswerCheck {
  verdict: Verdict;
  /** Warianty uznane za poprawne — przydają się na ekranie odpowiedzi. */
  accepted: string[];
}

/**
 * Jedyne miejsce, w którym aplikacja decyduje, czy odpowiedź jest dobra.
 * Wszystkie gry wołają `checkAnswer`. Reguły biorą się z kursu, więc przyszły
 * kurs z cyrylicą albo bez rozróżniania znaków diakrytycznych nie wymaga zmian tutaj.
 */
export function checkAnswer(
  course: Course,
  entry: VocabularyEntry,
  input: string | null,
  options: { lenient?: boolean } = {},
): AnswerCheck {
  const accepted = acceptedAnswers(entry);
  if (!input || !input.trim()) return { verdict: "miss", accepted };

  const rules = course.validation;
  const canon = (s: string) => canonical(s, rules);

  if (accepted.some((a) => canon(a) === canon(input))) return { verdict: "hit", accepted };

  // „Prawie" tylko wtedy, gdy znaki diakrytyczne mają znaczenie i użytkownik
  // pominął wyłącznie je. Przy diacriticsMatter = false ta ścieżka nie istnieje,
  // bo takie odpowiedzi są już pełnym trafieniem.
  const lenient = options.lenient ?? true;
  if (lenient && rules.diacriticsMatter) {
    const fold = (s: string) => foldDiacritics(canon(s), rules);
    if (accepted.some((a) => fold(a) === fold(input))) return { verdict: "near", accepted };
  }

  return { verdict: "miss", accepted };
}

export function canonical(value: string, rules: ValidationRules): string {
  let s = value.normalize("NFC");
  if (rules.trimWhitespace) s = s.trim().replace(/\s+/g, " ");
  if (rules.caseInsensitive) s = s.toLocaleLowerCase();
  return s;
}

export function foldDiacritics(value: string, rules: ValidationRules): string {
  const map = rules.foldMap;
  if (!map) return value;
  let out = "";
  for (const ch of value) out += map[ch] ?? ch;
  return out;
}

/**
 * Warianty akceptowane obok formy podstawowej. Pole `grammar` bywa opisowe,
 * więc bierzemy tylko warianty oznaczone jako równoprawne. Formy opisane jako
 * „nie X" to warianty spoza standardu i celowo NIE są akceptowane.
 */
export function acceptedAnswers(entry: VocabularyEntry): string[] {
  const out = [entry.targetText];
  const m = entry.grammar.match(/(?:też|częściej|potocznie|krócej):\s*([^-–;]+)/i);
  if (m) out.push(m[1].trim());
  return out.filter(Boolean);
}

export function maskedHint(word: string): string {
  return [...word][0] + "·".repeat(Math.max(0, [...word].length - 1));
}
