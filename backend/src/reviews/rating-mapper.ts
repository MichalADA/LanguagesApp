import { MASTERED_STABILITY } from "./fsrs-scheduler";
import { Rating } from "ts-fsrs";

export interface RatingInput {
  correct: boolean;
  usedHint?: boolean;
  attemptsBeforeCorrect?: number;
  responseTimeMs?: number;
  gameType: string;
}
/** Product policy, not scientifically calibrated weights. Never infer speed when absent. */
export function calculateReviewRating(
  input: RatingInput,
  stability = 0,
): Rating {
  if (!input.correct) return Rating.Again;
  if (
    input.usedHint ||
    (input.attemptsBeforeCorrect ?? 0) > 0 ||
    (input.responseTimeMs ?? 0) > 60_000
  )
    return Rating.Hard;
  const recognition =
    /pairs|match-columns|choice|true-false|odd-one-out|builder|scramble/.test(
      input.gameType,
    );
  if (recognition) return Rating.Hard;
  if (
    stability >= MASTERED_STABILITY &&
    input.responseTimeMs !== undefined &&
    input.responseTimeMs > 0 &&
    input.responseTimeMs < 4000
  )
    return Rating.Easy;
  return Rating.Good;
}
