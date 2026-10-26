import { DEFAULT_GOAL, isDailyGoal, XP_RULES, type DailyGoal, type XpSource } from "./goals";

/** Podsumowanie XP konta — ten sam kształt zwraca GET /me/xp. */
export interface XpSummary {
  total: number;
  today: number;
  goal: number;
  goalMet: boolean;
  goalStreak: number;
  last7: { day: string; xp: number }[];
}

export interface XpEvent {
  eventId: string;
  courseId: string;
  source: XpSource;
  sourceId: string;
  xp: number;
  day: string;
}

/** Lokalna księga XP gościa — te same reguły co backend (raz na źródło, limity, idempotencja). */
export interface XpLedger {
  goal: DailyGoal;
  events: XpEvent[];
}

export const emptyLedger = (): XpLedger => ({ goal: DEFAULT_GOAL, events: [] });

const shift = (day: string, by: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
};

export function award(ledger: XpLedger, event: XpEvent): { ledger: XpLedger; awarded: number } {
  if (ledger.events.some((e) => e.eventId === event.eventId)) return { ledger, awarded: 0 };
  const rule = XP_RULES[event.source];
  if (rule.once && ledger.events.some((e) => e.courseId === event.courseId && e.source === event.source && e.sourceId === event.sourceId)) {
    return { ledger, awarded: 0 };
  }
  const xp = Math.max(0, Math.min(rule.max, Math.round(event.xp)));
  if (!xp) return { ledger, awarded: 0 };
  return { ledger: { ...ledger, events: [...ledger.events, { ...event, xp }] }, awarded: xp };
}

export function summarize(ledger: XpLedger, today: string): XpSummary {
  const perDay = new Map<string, number>();
  for (const e of ledger.events) perDay.set(e.day, (perDay.get(e.day) ?? 0) + e.xp);
  const todayXp = perDay.get(today) ?? 0;
  let day = todayXp >= ledger.goal ? today : shift(today, -1);
  let goalStreak = 0;
  while ((perDay.get(day) ?? 0) >= ledger.goal) {
    goalStreak++;
    day = shift(day, -1);
  }
  return {
    total: ledger.events.reduce((sum, e) => sum + e.xp, 0),
    today: todayXp,
    goal: ledger.goal,
    goalMet: todayXp >= ledger.goal,
    goalStreak,
    last7: Array.from({ length: 7 }, (_, i) => {
      const d = shift(today, i - 6);
      return { day: d, xp: perDay.get(d) ?? 0 };
    }),
  };
}

/** Odczyt z localStorage: tylko poprawne wpisy. */
export function sanitizeLedger(value: unknown): XpLedger {
  if (!value || typeof value !== "object") return emptyLedger();
  const v = value as Partial<XpLedger>;
  const events = Array.isArray(v.events)
    ? v.events.filter(
        (e): e is XpEvent =>
          Boolean(e) && typeof e.eventId === "string" && typeof e.sourceId === "string" && e.source in XP_RULES && Number.isInteger(e.xp) && e.xp > 0 && typeof e.day === "string",
      )
    : [];
  // Przepuszczamy wpisy przez te same reguły (raz na źródło, limity) — zmieniony zapis nie dopisze XP.
  const clean = events.reduce((acc, e) => award(acc, e).ledger, { goal: isDailyGoal(v.goal) ? v.goal : DEFAULT_GOAL, events: [] } as XpLedger);
  return clean;
}
