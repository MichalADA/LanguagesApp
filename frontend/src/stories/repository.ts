import type { AuthenticatedRequest } from "@/auth/AuthContext";
import { createEventId } from "@/utils/eventId";
import { completeMission, sanitizeProgress, type StoryProgress } from "./progress";
import type { Mission, Story } from "./types";

/**
 * Trwały zapis postępu Stories.
 * - Gość: localStorage, per profil + kurs + historia (jak reszta trybu gościa).
 * - Konto: backend (GET/POST /stories/...). Ukończenie misji trafia najpierw do lokalnej
 *   kolejki z eventId; wysyłka ponawia ten sam eventId, więc zerwane połączenie nigdy nie
 *   przyzna nagrody dwa razy. Niewysłane ukończenia są doliczane do widoku do czasu wysyłki.
 */

const KEY = "lexodromia.stories.v1";
const localKey = (owner: string, courseId: string, storyId: string) => `${KEY}.${owner}.${courseId}.${storyId}`;
const outboxKey = (owner: string, courseId: string, storyId: string) => `${KEY}.outbox.${owner}.${courseId}.${storyId}`;

export interface PendingCompletion {
  missionId: string;
  eventId: string;
  score: number;
  xp: number;
  flags: string[];
  at: string;
}

interface Scope {
  owner: string;
  courseId: string;
  story: Pick<Story, "id" | "missions">;
  /** Obecne dla zalogowanych — wtedy źródłem prawdy jest backend. */
  request?: AuthenticatedRequest;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Brak storage (tryb prywatny) — postęp zostaje w pamięci sesji.
  }
}

export function readOutbox(owner: string, courseId: string, storyId: string): PendingCompletion[] {
  const value = read<unknown>(outboxKey(owner, courseId, storyId), []);
  return Array.isArray(value) ? value.filter((p): p is PendingCompletion => typeof p?.missionId === "string" && typeof p?.eventId === "string") : [];
}

/** Doliczenie niewysłanych ukończeń do stanu z serwera (bez podwójnych nagród). */
function withPending(progress: StoryProgress, pending: PendingCompletion[], missions: readonly Mission[]): StoryProgress {
  return pending.reduce((acc, p) => {
    const mission = missions.find((m) => m.id === p.missionId);
    return mission ? completeMission(acc, { ...mission, xp: p.xp }, p.score, p.flags, new Date(p.at)).progress : acc;
  }, progress);
}

const completePath = (storyId: string, missionId: string) => `/stories/${encodeURIComponent(storyId)}/missions/${encodeURIComponent(missionId)}/complete`;

/** Wysyła kolejkę po kolei; zwraca stan z serwera po ostatniej udanej wysyłce. */
async function flush(scope: Scope & { request: AuthenticatedRequest }): Promise<{ progress: StoryProgress | null; failed: boolean }> {
  const { owner, courseId, story, request } = scope;
  let progress: StoryProgress | null = null;
  for (const p of readOutbox(owner, courseId, story.id)) {
    try {
      const result = await request<{ progress: StoryProgress }>(completePath(story.id, p.missionId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: courseId, eventId: p.eventId, score: p.score, xp: p.xp, flags: p.flags }),
      });
      progress = result.progress;
      write(outboxKey(owner, courseId, story.id), readOutbox(owner, courseId, story.id).filter((x) => x.eventId !== p.eventId));
    } catch {
      return { progress, failed: true };
    }
  }
  return { progress, failed: false };
}

export interface LoadedProgress {
  progress: StoryProgress;
  /** Ukończenia czekające na wysyłkę (błąd sieci). */
  pending: number;
}

export async function loadStoryProgress(scope: Scope): Promise<LoadedProgress> {
  const { owner, courseId, story, request } = scope;
  if (!request) return { progress: sanitizeProgress(story.id, read(localKey(owner, courseId, story.id), null)), pending: 0 };
  await flush({ ...scope, request }).catch(() => undefined);
  const server = sanitizeProgress(story.id, await request<StoryProgress>(`/stories/${encodeURIComponent(story.id)}/progress?course=${encodeURIComponent(courseId)}`));
  const pending = readOutbox(owner, courseId, story.id);
  return { progress: withPending(server, pending, story.missions), pending: pending.length };
}

export interface SavedCompletion extends LoadedProgress {
  firstCompletion: boolean;
  xpAwarded: number;
}

export async function saveMissionCompletion(scope: Scope, current: StoryProgress, mission: Mission, score: number, flags: readonly string[]): Promise<SavedCompletion> {
  const { owner, courseId, story, request } = scope;
  const local = completeMission(current, mission, score, flags);
  if (!request) {
    write(localKey(owner, courseId, story.id), local.progress);
    return { ...local, pending: 0 };
  }
  // Najpierw kolejka (przetrwa odświeżenie), potem wysyłka.
  const entry: PendingCompletion = { missionId: mission.id, eventId: createEventId(), score, xp: mission.xp, flags: [...flags], at: new Date().toISOString() };
  write(outboxKey(owner, courseId, story.id), [...readOutbox(owner, courseId, story.id), entry]);
  const sent = await flush({ ...scope, request });
  if (sent.failed || !sent.progress) return { ...local, pending: readOutbox(owner, courseId, story.id).length };
  return { progress: sent.progress, firstCompletion: local.firstCompletion, xpAwarded: local.xpAwarded, pending: 0 };
}
