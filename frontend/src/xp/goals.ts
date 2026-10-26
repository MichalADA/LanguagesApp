import type { LessonKind } from "@/curriculum/types";

/**
 * Dzienny cel nauki (poziom intensywności) i zasady XP — te same co w backendzie
 * (backend/src/xp/xp.policy.ts). XP mierzy wysiłek, nie „poziom opanowania” — to robi FSRS.
 */
export const DAILY_GOALS = [
  { xp: 10, id: "light", minutes: 5 },
  { xp: 20, id: "regular", minutes: 10 },
  { xp: 30, id: "serious", minutes: 15 },
  { xp: 50, id: "intense", minutes: 25 },
] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number]["xp"];
export const DEFAULT_GOAL: DailyGoal = 20;
export const isDailyGoal = (value: unknown): value is DailyGoal => DAILY_GOALS.some((g) => g.xp === value);

export type XpSource = "lesson" | "story" | "review";
export const XP_RULES: Record<XpSource, { max: number; once: boolean }> = {
  lesson: { max: 100, once: true },
  story: { max: 500, once: true },
  review: { max: 50, once: false },
};

/** Zaliczona lekcja (pierwszy raz): zwykła 20, powtórka modułu / rozmowa / spirala 30, test poziomu 50. */
export function lessonXp(kind: LessonKind | undefined): number {
  if (kind === "test") return 50;
  if (kind === "review" || kind === "spiral" || kind === "conversation") return 30;
  return 20;
}

/** Sesja powtórek: 1 XP za każdą poprawną odpowiedź (maks. 50). */
export const reviewXp = (correct: number) => Math.max(0, Math.min(XP_RULES.review.max, Math.round(correct)));
