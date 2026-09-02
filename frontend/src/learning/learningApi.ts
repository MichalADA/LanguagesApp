import type { AuthenticatedRequest } from "@/auth/AuthContext";

export interface LearningAnswerInput {
  wordRef: string;
  answer: string;
  correct: boolean;
}

interface LearningSession {
  id: string;
}

const json = (body: unknown): RequestInit => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function startLearningSession(
  request: AuthenticatedRequest,
  course: string,
): Promise<LearningSession> {
  return request<LearningSession>("/me/learning/sessions", {
    method: "POST",
    ...json({ course }),
  });
}
export function recordLearningAnswer(
  request: AuthenticatedRequest,
  sessionId: string,
  answer: LearningAnswerInput,
): Promise<void> {
  return request(`/me/learning/sessions/${encodeURIComponent(sessionId)}/answers`, {
    method: "POST",
    ...json(answer),
  });
}

export function finishLearningSession(
  request: AuthenticatedRequest,
  sessionId: string,
): Promise<void> {
  return request(`/me/learning/sessions/${encodeURIComponent(sessionId)}/finish`, {
    method: "POST",
  });
}
