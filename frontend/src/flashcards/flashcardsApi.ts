import type { AuthenticatedRequest } from "@/auth/AuthContext";
import type {
  FlashcardDirection,
  FlashcardMode,
  FlashcardProgress,
  FlashcardRating,
  FlashcardSessionResponse,
  FlashcardsSummary,
} from "./types";

const json = (body: unknown): RequestInit => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function fetchSummary(
  request: AuthenticatedRequest,
  course: string,
): Promise<FlashcardsSummary> {
  return request(`/me/flashcards/summary?course=${encodeURIComponent(course)}`);
}

export function fetchProgress(
  request: AuthenticatedRequest,
  course: string,
): Promise<FlashcardProgress[]> {
  return request(`/me/flashcards/progress?course=${encodeURIComponent(course)}`);
}

export function fetchReviewQueue(
  request: AuthenticatedRequest,
  course: string,
  limit: number,
): Promise<FlashcardProgress[]> {
  const q = new URLSearchParams({ course, limit: String(limit) });
  return request(`/me/flashcards/review-queue?${q.toString()}`);
}

export function fetchDifficult(
  request: AuthenticatedRequest,
  course: string,
  limit: number,
): Promise<FlashcardProgress[]> {
  const q = new URLSearchParams({ course, limit: String(limit) });
  return request(`/me/flashcards/difficult?${q.toString()}`);
}

export function markSeen(
  request: AuthenticatedRequest,
  input: { course: string; wordRef: string },
): Promise<FlashcardProgress> {
  return request(`/me/flashcards/seen`, { method: "POST", ...json(input) });
}

export function toggleDifficult(
  request: AuthenticatedRequest,
  input: { course: string; wordRef: string; markedDifficult: boolean },
): Promise<FlashcardProgress> {
  return request(`/me/flashcards/mark-difficult`, { method: "POST", ...json(input) });
}

export interface SubmitAnswerInput {
  course: string;
  wordRef: string;
  direction: Exclude<FlashcardDirection, "MIXED">;
  answer: string;
  correct: boolean;
  rating: FlashcardRating;
  sessionId?: string;
}

export function submitAnswer(
  request: AuthenticatedRequest,
  input: SubmitAnswerInput,
): Promise<{ card: FlashcardProgress; sessionId: string | null }> {
  return request(`/me/flashcards/answers`, { method: "POST", ...json(input) });
}

export function startSession(
  request: AuthenticatedRequest,
  input: { course: string; mode: FlashcardMode; direction: FlashcardDirection },
): Promise<FlashcardSessionResponse> {
  return request(`/me/flashcards/sessions`, { method: "POST", ...json(input) });
}

export function finishSession(
  request: AuthenticatedRequest,
  sessionId: string,
): Promise<FlashcardSessionResponse> {
  return request(`/me/flashcards/sessions/${encodeURIComponent(sessionId)}/finish`, {
    method: "POST",
  });
}
