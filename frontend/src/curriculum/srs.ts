import type { LessonVocabularyItem } from "./types";

/**
 * Adapter: słowa z ukończonych lekcji → przyszłe powtórki (FSRS).
 *
 * DZIŚ: kolejka w localStorage — nic nie trafia jeszcze do harmonogramu FSRS
 * i UI tego nie obiecuje. To jedyne miejsce do podmiany:
 * TODO(curriculum-fsrs): dla zalogowanych wysłać `items` do backendu
 *   (np. POST /curriculum/progress/vocabulary { course, lessonId, items }),
 *   który utworzy karty FSRS dla recordId; dla gości zostawić lokalną kolejkę.
 */

const QUEUE_KEY = "lexodromia.curriculum.srsQueue.v1";

export interface QueuedLessonVocabulary {
  lessonId: string;
  queuedAt: number;
  items: LessonVocabularyItem[];
}

const keyFor = (owner: string, courseId: string) => `${QUEUE_KEY}.${owner}.${courseId}`;

export function readVocabularyQueue(owner: string, courseId: string): QueuedLessonVocabulary[] {
  try {
    const raw = localStorage.getItem(keyFor(owner, courseId));
    const parsed = raw ? (JSON.parse(raw) as QueuedLessonVocabulary[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Idempotentne: powtórzenie lekcji nie dubluje wpisu. */
export function queueLessonVocabulary(owner: string, courseId: string, lessonId: string, items: LessonVocabularyItem[]): void {
  if (!items.length) return;
  const queue = readVocabularyQueue(owner, courseId);
  if (queue.some((entry) => entry.lessonId === lessonId)) return;
  queue.push({ lessonId, queuedAt: Date.now(), items });
  try {
    localStorage.setItem(keyFor(owner, courseId), JSON.stringify(queue));
  } catch {
    // Brak storage — trudno, słowa i tak są w materiale lekcji.
  }
}
