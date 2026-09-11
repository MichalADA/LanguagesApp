import { createEmptyCard, fsrs, Rating, State, type Card } from "ts-fsrs";
import type { ReviewState } from "@prisma/client";

export const MASTERED_STABILITY = 30;
export const masteredStateWhere = {
  state: State.Review,
  stability: { gte: MASTERED_STABILITY },
  correctAnswers: { gte: 3 },
};

export const SCHEDULER_VERSION = "ts-fsrs@5.2.3/default/retention-0.9";
const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false });
export function schedule(row: ReviewState, rating: Rating, now: Date) {
  const card: Card =
    row.reps === 0
      ? createEmptyCard(now)
      : {
          due: row.due,
          stability: row.stability,
          difficulty: row.difficulty,
          elapsed_days: row.elapsedDays,
          scheduled_days: row.scheduledDays,
          reps: row.reps,
          lapses: row.lapses,
          state: row.state as State,
          last_review: row.lastReview ?? undefined,
          learning_steps: row.learningSteps,
        };
  return scheduler.next(card, now, rating as Exclude<Rating, Rating.Manual>)
    .card;
}
/** UI threshold is explicit product policy; mastery is not permanent. */
export function reviewStatus(
  row: Pick<ReviewState, "reps" | "state" | "stability" | "correctAnswers">,
) {
  if (!row.reps) return "NEW" as const;
  if (
    row.state === State.Review &&
    row.stability >= MASTERED_STABILITY &&
    row.correctAnswers >= masteredStateWhere.correctAnswers.gte
  )
    return "MASTERED" as const;
  return row.state === State.Review
    ? ("REVIEW" as const)
    : ("LEARNING" as const);
}
