import type { VocabularyEntry } from "@/vocabulary/types";
import type { FlashcardMode, FlashcardProgress } from "./types";

export interface QueueItem {
  entry: VocabularyEntry;
  progress: FlashcardProgress | null;
  /** Whether this card is being seen for the first time in this session. */
  isNew: boolean;
}

/**
 * Compose the study queue given the CSV (owned by the frontend) and the
 * server-side per-word progress (owned by the backend).
 *
 * - REVIEW: cards whose nextReviewAt <= now, sorted oldest-due first.
 * - DIFFICULT: DIFFICULT status OR user-flagged, sorted by difficultyScore.
 * - NEW: entries with no progress yet, picked by rank order.
 * - MIXED: review first, then fill up with new words.
 */
export function buildQueue(
  entries: readonly VocabularyEntry[],
  progressByRef: ReadonlyMap<string, FlashcardProgress>,
  mode: FlashcardMode,
  limit: number,
): QueueItem[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const now = Date.now();
  const size = Math.max(1, Math.min(limit, 60));

  const dueItems: QueueItem[] = [];
  const difficultItems: QueueItem[] = [];
  for (const p of progressByRef.values()) {
    const entry = byId.get(p.wordRef);
    if (!entry) continue;
    const due = (!p.nextReviewAt || new Date(p.nextReviewAt).getTime() <= now);
    if (due) dueItems.push({ entry, progress: p, isNew: false });
    if (p.status === "DIFFICULT" || p.difficultyScore > 0 || p.markedDifficult) {
      difficultItems.push({ entry, progress: p, isNew: false });
    }
  }

  dueItems.sort(
    (a, b) =>
      dateFor(a.progress?.nextReviewAt) - dateFor(b.progress?.nextReviewAt) ||
      (b.progress?.difficultyScore ?? 0) - (a.progress?.difficultyScore ?? 0),
  );
  difficultItems.sort(
    (a, b) =>
      (b.progress?.difficultyScore ?? 0) - (a.progress?.difficultyScore ?? 0) ||
      dateFor(a.progress?.nextReviewAt) - dateFor(b.progress?.nextReviewAt),
  );

  // NEW = anything without a row on the backend yet, or a row still in NEW
  // status with zero repetitions (games call `seen` and create a NEW row
  // without ever showing the word as a flashcard).
  const newItems: QueueItem[] = [];
  for (const entry of entries) {
    const p = progressByRef.get(entry.id) ?? null;
    if (!p || (p.status === "NEW" && p.repetitions === 0)) {
      newItems.push({ entry, progress: p, isNew: true });
    }
  }
  newItems.sort((a, b) => a.entry.rank - b.entry.rank);

  if (mode === "REVIEW") return dueItems.slice(0, size);
  if (mode === "DIFFICULT") return difficultItems.slice(0, size);
  if (mode === "NEW") return newItems.slice(0, size);

  // MIXED: prioritise due cards, then fill with new. Difficult cards that
  // are due are already in `dueItems`; any that aren't due yet are ignored.
  const seen = new Set<string>();
  const combined: QueueItem[] = [];
  for (const item of dueItems) {
    if (combined.length >= size) break;
    if (seen.has(item.entry.id)) continue;
    seen.add(item.entry.id);
    combined.push(item);
  }
  for (const item of newItems) {
    if (combined.length >= size) break;
    if (seen.has(item.entry.id)) continue;
    seen.add(item.entry.id);
    combined.push(item);
  }
  return combined;
}

function dateFor(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}
