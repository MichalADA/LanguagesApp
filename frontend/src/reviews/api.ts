import type { AuthenticatedRequest } from "@/auth/AuthContext";
export interface ReviewItem {
  id: string;
  itemType: "WORD" | "SENTENCE" | "VERB" | "GRAMMAR" | "PHRASE";
  itemId: string;
  due: string;
  course: { slug: string };
}
export interface ReviewStats {
  seen: number;
  new: number;
  learning: number;
  mastered: number;
  due: number;
  overdue: number;
  accuracy7: number | null;
  accuracy30: number | null;
  totalAnswers: number;
  wrongAnswers: number;
}
export interface ReviewAnswer {
  sessionId?: string;
  eventId: string;
  course: string;
  itemType: ReviewItem["itemType"];
  itemId: string;
  gameType: string;
  direction?: "SOURCE_TO_TARGET" | "TARGET_TO_SOURCE";
  answer: string;
  correct: boolean;
  usedHint: boolean;
  responseTimeMs: number;
  attemptsBeforeCorrect: number;
}
export const fetchDue = (request: AuthenticatedRequest, course: string) =>
  request<ReviewItem[]>(
    `/reviews/due?course=${encodeURIComponent(course)}&limit=20`,
  );
export const fetchReviewStats = (
  request: AuthenticatedRequest,
  course: string,
) =>
  request<ReviewStats>(`/reviews/stats?course=${encodeURIComponent(course)}`);
export async function submitReview(
  request: AuthenticatedRequest,
  answer: ReviewAnswer,
) {
  const result = await request("/reviews/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answer),
  });
  window.dispatchEvent(new Event("review-updated"));
  return result;
}

export async function fetchAllProgress(
  request: AuthenticatedRequest,
  course: string,
) {
  type Item = import("@/flashcards/types").FlashcardProgress & {
    itemType: ReviewItem["itemType"];
  };
  const items: Item[] = [];
  let cursor: string | null = null;
  do {
    const page: { items: Item[]; cursor: string | null } = await request(
      `/reviews/progress?course=${encodeURIComponent(course)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    items.push(...page.items);
    cursor = page.cursor;
  } while (cursor);
  return items;
}
