import type { AuthenticatedRequest } from "@/auth/AuthContext";
import type { LessonVocabularyItem, ReviewRef } from "./types";

/**
 * Słowa z ukończonych lekcji → karty FSRS w backendzie (POST /reviews/enroll).
 *
 * Kolejka w localStorage działa jak skrzynka nadawcza:
 * - ukończenie lekcji zapisuje wpis lokalnie (najpierw), dopiero potem wysyłamy go do backendu,
 * - wpis dostaje `syncedAt` dopiero po potwierdzeniu — błąd sieci zostawia go do ponowienia,
 * - backend dodaje karty idempotentnie (istniejące karty z gier i fiszek zostają bez zmian),
 *   więc ponowienie po zerwanym połączeniu nigdy nie dubluje ani nie resetuje harmonogramu.
 *
 * Do FSRS trafiają tylko słowa obowiązkowe (z osobnych kart w lekcji) jako NOWE karty:
 * bez oceny i bez zapisu próby — obejrzenie słowa nie jest dowodem, że uczeń je pamięta.
 * Gość: kolejka zostaje lokalnie; po zalogowaniu można ją świadomie dodać do konta.
 */

const QUEUE_KEY = "lexodromia.curriculum.srsQueue.v1";

export interface QueuedLessonVocabulary {
  lessonId: string;
  queuedAt: number;
  items: LessonVocabularyItem[];
  /** Kiedy backend potwierdził karty. Brak = czeka na wysłanie (też wpisy sprzed integracji). */
  syncedAt?: number;
}

const keyFor = (owner: string, courseId: string) => `${QUEUE_KEY}.${owner}.${courseId}`;

export function readVocabularyQueue(owner: string, courseId: string): QueuedLessonVocabulary[] {
  try {
    const raw = localStorage.getItem(keyFor(owner, courseId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is QueuedLessonVocabulary => typeof entry?.lessonId === "string" && Array.isArray(entry.items))
      : [];
  } catch {
    return [];
  }
}

function writeQueue(owner: string, courseId: string, queue: QueuedLessonVocabulary[]): void {
  try {
    localStorage.setItem(keyFor(owner, courseId), JSON.stringify(queue));
  } catch {
    // Brak storage — trudno, słowa i tak są w materiale lekcji.
  }
}

/** Idempotentne: powtórzenie lekcji nie dubluje wpisu. */
export function queueLessonVocabulary(owner: string, courseId: string, lessonId: string, items: LessonVocabularyItem[]): void {
  if (!items.length) return;
  const queue = readVocabularyQueue(owner, courseId);
  if (queue.some((entry) => entry.lessonId === lessonId)) return;
  queue.push({ lessonId, queuedAt: Date.now(), items });
  writeQueue(owner, courseId, queue);
}

export function pendingLessonVocabulary(owner: string, courseId: string): QueuedLessonVocabulary[] {
  return readVocabularyQueue(owner, courseId).filter((entry) => !entry.syncedAt);
}

/** Karty FSRS dla słów lekcji: tylko obowiązkowe, bez powtórzeń. */
export function enrollmentRefs(items: readonly LessonVocabularyItem[]): ReviewRef[] {
  const out = new Map<string, ReviewRef>();
  for (const item of items) {
    if (item.optional || !item.review) continue;
    out.set(`${item.review.itemType}|${item.review.itemId}`, item.review);
  }
  return [...out.values()];
}

/** Słowa lekcji z aktualnych danych kursu (null — lekcji już nie ma). */
export type LessonVocabularyResolver = (lessonId: string) => Promise<LessonVocabularyItem[] | null>;

export interface SyncResult {
  /** Lekcje potwierdzone przez backend w tym przebiegu. */
  synced: number;
  /** Nowe karty FSRS (bez tych, które już istniały). */
  created: number;
  /** Lekcje, które nadal czekają (błąd sieci / serwera). */
  pending: number;
}

const running = new Map<string, Promise<SyncResult>>();

/**
 * Wysyła niepotwierdzone wpisy kolejki do FSRS. Bezpieczne do wołania wiele razy:
 * równoległe wywołania dla tego samego właściciela czekają na jeden przebieg.
 * Słowa bierzemy z aktualnej treści lekcji (resolver), a dopiero gdy jej brak — z zapisu
 * w kolejce; dzięki temu stare wpisy (bez identyfikatorów kart) też trafiają do FSRS.
 */
export function syncLessonVocabulary(
  request: AuthenticatedRequest,
  owner: string,
  courseId: string,
  resolve: LessonVocabularyResolver,
): Promise<SyncResult> {
  const key = keyFor(owner, courseId);
  const current = running.get(key);
  if (current) return current;
  const run = (async () => {
    const result: SyncResult = { synced: 0, created: 0, pending: 0 };
    for (const entry of pendingLessonVocabulary(owner, courseId)) {
      try {
        const fresh = await resolve(entry.lessonId).catch(() => null);
        const refs = enrollmentRefs(fresh ?? entry.items);
        if (refs.length) {
          const response = await request<{ created: number }>("/reviews/enroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ course: courseId, source: `lesson:${entry.lessonId}`, items: refs }),
          });
          result.created += response?.created ?? 0;
        }
        // Zapis po każdej lekcji: przerwany przebieg nie gubi już potwierdzonych wpisów.
        writeQueue(
          owner,
          courseId,
          readVocabularyQueue(owner, courseId).map((item) => (item.lessonId === entry.lessonId ? { ...item, syncedAt: Date.now() } : item)),
        );
        result.synced += 1;
      } catch {
        result.pending += 1;
      }
    }
    if (result.created) window.dispatchEvent(new Event("review-updated"));
    return result;
  })().finally(() => running.delete(key));
  running.set(key, run);
  return run;
}
