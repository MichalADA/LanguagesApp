import type { AuthenticatedRequest } from "@/auth/AuthContext";
import { loadCurriculumReviewItems } from "@/curriculum/reviewItems";
import { queueLessonVocabulary, syncLessonVocabulary } from "@/curriculum/srs";
import type { LessonVocabularyItem } from "@/curriculum/types";
import { submitReview } from "@/reviews/api";
import { createEventId } from "@/utils/eventId";
import type { BuildNode, Mission, Story, TypeNode } from "./types";

/**
 * Stories ↔ reszta Lexodromii: nagrania kursu, FSRS i kolejka nowych kart.
 * Żadnego równoległego systemu powtórek — tylko istniejące endpointy.
 */

/** Nagranie dokładnie tej wypowiedzi (src/stories/data/<historia>/audio.ts), głosem pasującym do postaci. */
export function audioFor(audio: Record<string, { female?: string; male?: string }>, text: string, voice?: "female" | "male"): string | undefined {
  const entry = audio[text];
  if (!entry) return undefined;
  return voice ? entry[voice] : entry.female ?? entry.male;
}

/**
 * Odpowiedź z zadania produkcyjnego (ułóż / wpisz) → jedna próba FSRS dla ćwiczonego słowa.
 * Zasady (bez sztucznego podbijania opanowania):
 * - tylko zadania z jawnie wskazanym słowem (`practice`), tylko pierwsza próba w węźle,
 * - tylko gdy misja nie jest jeszcze ukończona (powtórka misji to trening bez wpływu na FSRS),
 * - układanie z kafelków = „builder” (FSRS: trudne), wpisanie = pełna ocena; odsłonięte
 *   tłumaczenie = podpowiedź (trudne); błąd tylko w diakrytykach = nearMiss (trudne).
 */
export async function reportPractice(
  request: AuthenticatedRequest,
  courseId: string,
  mission: Mission,
  node: BuildNode | TypeNode,
  attempt: { answer: string; correct: boolean; near: boolean; usedHint: boolean; responseTimeMs: number },
): Promise<void> {
  const word = mission.vocabulary.find((w) => w.hr === node.practice);
  if (!word) return;
  await submitReview(request, {
    eventId: createEventId(),
    course: courseId,
    itemType: word.review.itemType,
    itemId: word.review.itemId,
    gameType: node.kind === "build" ? "stories-builder" : "stories-typing",
    direction: "SOURCE_TO_TARGET",
    answer: attempt.answer.slice(0, 500),
    correct: attempt.correct,
    usedHint: attempt.usedHint,
    responseTimeMs: Math.min(86_400_000, Math.max(0, Math.round(attempt.responseTimeMs))),
    attemptsBeforeCorrect: 0,
    ...(attempt.near ? { nearMiss: true } : {}),
  });
}

/**
 * Po misji: jej słownictwo trafia do FSRS jako nowe karty — tą samą kolejką co słowa z lekcji
 * (idempotentnie, z ponawianiem; gość: lokalnie, import po zalogowaniu). Zwroty bez treści
 * w powtórkach (PHRASE spoza indeksu kursu) pomijamy, żeby nie tworzyć kart, których nie da się powtórzyć.
 */
export async function enrollMissionVocabulary(owner: string, story: Story, mission: Mission, request: AuthenticatedRequest | null): Promise<number> {
  const phrases = await loadCurriculumReviewItems(story.courseId).catch(() => ({}) as Record<string, unknown>);
  const items: LessonVocabularyItem[] = mission.vocabulary
    .filter((w) => w.review.itemType === "WORD" || w.review.itemId in phrases)
    .map((w) => ({ target: w.hr, source: w.pl, review: w.review }));
  if (!items.length) return 0;
  const source = `stories:${story.id}:${mission.id}`;
  queueLessonVocabulary(owner, story.courseId, source, items);
  if (request) await syncLessonVocabulary(request, owner, story.courseId, async () => null).catch(() => undefined);
  return items.length;
}
