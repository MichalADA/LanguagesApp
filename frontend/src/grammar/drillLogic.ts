import type { ValidationRules } from "@/courses/types";
import type { FormProgress } from "@/progress/types";
import { canonical, foldDiacritics, type Verdict } from "@/services/validation";
import type { DrillItem } from "./drills";

export const DRILL_ROUND = 10;
export const DRILL_HIT = 10;
export const DRILL_NEAR = 5;

/** Klucz postępu zadania (w tej samej mapie co formy Odmiany). */
export const drillKey = (topic: string, itemId: string) => `drill:${topic}:${itemId}`;

/** Interpunkcja nie decyduje o poprawności formy (zdanie z kafelków nie ma kropki). */
const stripPunctuation = (s: string) => s.replace(/[.,!?;:„”"…()]/g, " ");

/** Ocena odpowiedzi tekstowej: dokładnie — hit; tylko bez diakrytyków — near (gdy reguły tak mówią). */
export function judgeText(answers: readonly string[], input: string, rules: ValidationRules, lenient = true): Verdict {
  if (!input.trim()) return "miss";
  const canon = (s: string) => canonical(stripPunctuation(s), { ...rules, trimWhitespace: true });
  if (answers.some((a) => canon(a) === canon(input))) return "hit";
  if (lenient && rules.diacriticsMatter) {
    const fold = (s: string) => foldDiacritics(canon(s), rules);
    if (answers.some((a) => fold(a) === fold(input))) return "near";
  }
  return "miss";
}

export function judgeItem(item: DrillItem, answer: string | number, rules: ValidationRules, lenient = true): Verdict {
  if (item.kind === "choice") return answer === item.answer ? "hit" : "miss";
  if (typeof answer !== "string") return "miss";
  return judgeText(item.answers, answer, rules, item.kind === "gap" && lenient);
}

export function correctAnswer(item: DrillItem): string {
  if (item.kind === "choice") return item.options[item.answer];
  return item.answers[0];
}

/** Zadania mylone wracają częściej, opanowane prawie znikają — jak w Odmianie. */
export function weightFor(stat: FormProgress | undefined): number {
  if (!stat || stat.attempts === 0) return 2;
  let w = 1 + 2.5 * stat.difficulty;
  if (stat.currentStreak === 0) w += 1.2;
  w -= Math.min(0.85, 0.3 * stat.currentStreak);
  return Math.max(0.15, w);
}

/** Losuje rundę bez powtórzeń, ważoną postępem. */
export function pickRound<T extends { id: string }>(items: readonly T[], statOf: (id: string) => FormProgress | undefined, size = DRILL_ROUND, random = Math.random): T[] {
  const pool = items.map((item) => ({ item, weight: weightFor(statOf(item.id)) }));
  const out: T[] = [];
  while (out.length < size && pool.length) {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let roll = random() * total;
    let index = pool.findIndex((p) => (roll -= p.weight) <= 0);
    if (index < 0) index = pool.length - 1;
    out.push(pool[index].item);
    pool.splice(index, 1);
  }
  return out;
}

export function shuffled<T>(list: readonly T[], random = Math.random): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
