import type { AuthenticatedRequest } from "@/auth/AuthContext";

export interface UserStatistics {
  courseId: string | null;
  totalSessions: number;
  totalAnswers: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  wordsLearned: number;
  currentStreak: number;
  longestStreak: number;
}

export function fetchUserStatistics(
  request: AuthenticatedRequest,
  courseId: string,
): Promise<UserStatistics> {
  const query = new URLSearchParams({ courseId });
  return request<UserStatistics>(`/me/statistics?${query.toString()}`);
}
