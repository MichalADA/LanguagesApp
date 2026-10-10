/**
 * XP policy — product rules, not a scientific measure of knowledge.
 * - lesson / story: awarded once per source (first pass); replays earn nothing,
 * - review: per finished review session, capped per event.
 * Daily goal levels mirror the frontend selector (src/xp/goals.ts).
 */
export const XP_SOURCES = {
  lesson: { max: 100, once: true },
  story: { max: 500, once: true },
  review: { max: 50, once: false },
} as const;
export type XpSource = keyof typeof XP_SOURCES;

export const DAILY_GOALS = [10, 20, 30, 50] as const;
export const DEFAULT_GOAL = 20;

const warsaw = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
/** Calendar day in the application's time zone (same as the activity streak). */
export const dayKey = (date = new Date()) => warsaw.format(date);

export function previousDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Consecutive days (ending today, or yesterday if today is not done yet) with the goal reached. */
export function goalStreak(
  perDay: ReadonlyMap<string, number>,
  goal: number,
  today: string,
): number {
  let day = (perDay.get(today) ?? 0) >= goal ? today : previousDay(today);
  let streak = 0;
  while ((perDay.get(day) ?? 0) >= goal) {
    streak++;
    day = previousDay(day);
  }
  return streak;
}
