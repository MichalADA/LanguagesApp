import type { AuthenticatedRequest } from "@/auth/AuthContext";
import { createEventId } from "@/utils/eventId";
import { todayKey } from "@/utils/date";
import type { DailyGoal, XpSource } from "./goals";
import { award, sanitizeLedger, summarize, type XpEvent, type XpSummary } from "./ledger";

/**
 * Zapis XP: gość → localStorage (księga zdarzeń), konto → backend (/me/xp) z kolejką:
 * zdarzenie trafia najpierw do kolejki z eventId, wysyłka ponawia ten sam eventId.
 */
const KEY = "lexodromia.xp.v1";
const ledgerKey = (owner: string) => `${KEY}.${owner}`;
const outboxKey = (owner: string) => `${KEY}.outbox.${owner}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Brak storage — XP zostaje w pamięci sesji.
  }
}

export const readOutbox = (owner: string): XpEvent[] => {
  const v = read<unknown>(outboxKey(owner), []);
  return Array.isArray(v) ? v.filter((e): e is XpEvent => typeof e?.eventId === "string") : [];
};

export interface XpScope {
  owner: string;
  request?: AuthenticatedRequest;
}

async function flush({ owner, request }: Required<XpScope>): Promise<XpSummary | null> {
  let last: XpSummary | null = null;
  for (const e of readOutbox(owner)) {
    const result = await request<{ summary: XpSummary }>("/me/xp/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course: e.courseId, eventId: e.eventId, source: e.source, sourceId: e.sourceId, xp: e.xp }),
    });
    last = result.summary;
    write(outboxKey(owner), readOutbox(owner).filter((x) => x.eventId !== e.eventId));
  }
  return last;
}

export async function loadXp({ owner, request }: XpScope): Promise<{ summary: XpSummary; pending: number }> {
  if (!request) return { summary: summarize(sanitizeLedger(read(ledgerKey(owner), null)), todayKey()), pending: 0 };
  await flush({ owner, request }).catch(() => undefined);
  return { summary: await request<XpSummary>("/me/xp"), pending: readOutbox(owner).length };
}

export async function awardXp(
  { owner, request }: XpScope,
  input: { courseId: string; source: XpSource; sourceId: string; xp: number },
): Promise<{ summary: XpSummary | null; pending: number }> {
  const event: XpEvent = { ...input, eventId: createEventId(), day: todayKey() };
  if (!request) {
    const result = award(sanitizeLedger(read(ledgerKey(owner), null)), event);
    write(ledgerKey(owner), result.ledger);
    return { summary: summarize(result.ledger, todayKey()), pending: 0 };
  }
  write(outboxKey(owner), [...readOutbox(owner), event]);
  try {
    return { summary: await flush({ owner, request }), pending: readOutbox(owner).length };
  } catch {
    // Błąd sieci: zdarzenie czeka w kolejce i zostanie wysłane przy następnym wczytaniu.
    return { summary: null, pending: readOutbox(owner).length };
  }
}

export async function saveGoal({ owner, request }: XpScope, goal: DailyGoal): Promise<XpSummary> {
  if (!request) {
    const ledger = { ...sanitizeLedger(read(ledgerKey(owner), null)), goal };
    write(ledgerKey(owner), ledger);
    return summarize(ledger, todayKey());
  }
  return request<XpSummary>("/me/xp/goal", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal }) });
}
