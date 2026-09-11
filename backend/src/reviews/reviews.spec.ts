import { Rating, State, createEmptyCard, fsrs } from "ts-fsrs";
import type { ReviewState } from "@prisma/client";
import { schedule, reviewStatus } from "./fsrs-scheduler";
import { calculateReviewRating } from "./rating-mapper";
import { reviewIdentity } from "./review-identity";
import { streakFromDays } from "./activity";

const now = new Date("2026-09-11T12:00:00Z");
const fresh = { reps: 0 } as ReviewState;
describe("FSRS scheduling policy", () => {
  it.each([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy])(
    "uses the real library for rating %s",
    (rating) => {
      const expected = fsrs({
        request_retention: 0.9,
        enable_fuzz: false,
      }).next(
        createEmptyCard(now),
        now,
        rating as Exclude<Rating, Rating.Manual>,
      ).card;
      expect(schedule(fresh, rating, now)).toEqual(expected);
      expect(expected.due.getTime()).toBeGreaterThan(now.getTime());
      expect(Number.isFinite(expected.stability)).toBe(true);
    },
  );
  it("keeps complete FSRS state through spaced reviews and a lapse", () => {
    let row = fresh;
    let at = now;
    for (let n = 0; n < 8; n++) {
      const card = schedule(row, Rating.Good, at);
      expect(card.reps).toBe(n + 1);
      row = {
        ...row,
        state: card.state,
        stability: card.stability,
        difficulty: card.difficulty,
        due: card.due,
        lastReview: card.last_review!,
        scheduledDays: card.scheduled_days,
        elapsedDays: card.elapsed_days,
        learningSteps: card.learning_steps,
        reps: card.reps,
        lapses: card.lapses,
        correctAnswers: n + 1,
      };
      at = card.due;
    }
    expect(reviewStatus(row)).toBe("MASTERED");
    const missed = schedule(row, Rating.Again, at);
    expect(missed.lapses).toBe(row.lapses + 1);
    expect(missed.stability).toBeLessThan(row.stability);
    expect(reviewStatus({ ...row, ...missed })).toBe("LEARNING");
  });
  it("does not grant mastery solely from three hits or a migrated counter", () => {
    expect(
      reviewStatus({
        reps: 0,
        state: State.New,
        stability: 0,
        correctAnswers: 100,
      }),
    ).toBe("NEW");
    expect(
      reviewStatus({
        reps: 3,
        state: State.Review,
        stability: 2,
        correctAnswers: 3,
      }),
    ).toBe("REVIEW");
  });
  it("maps wrong, assisted, recognition, untimed and fast well-known answers conservatively", () => {
    const base = { correct: true, gameType: "bura" };
    expect(calculateReviewRating({ ...base, correct: false })).toBe(
      Rating.Again,
    );
    for (const extra of [
      { usedHint: true },
      { attemptsBeforeCorrect: 1 },
      { responseTimeMs: 61000 },
      { gameType: "match-columns" },
      { gameType: "sentence-builder" },
    ])
      expect(calculateReviewRating({ ...base, ...extra }, 40)).toBe(
        Rating.Hard,
      );
    expect(calculateReviewRating(base, 40)).toBe(Rating.Good);
    expect(calculateReviewRating({ ...base, responseTimeMs: 2000 }, 40)).toBe(
      Rating.Easy,
    );
    expect(calculateReviewRating({ ...base, responseTimeMs: 2000 }, 0)).toBe(
      Rating.Good,
    );
  });
  it("canonicalizes sentence modes and isolates courses", () => {
    expect(reviewIdentity("pl-hr", "sentence:gap:a1-01")).toEqual(
      reviewIdentity("pl-hr", "sentence:translation:a1-01"),
    );
    expect(reviewIdentity("pl-hr", "pl-hr:42")).toEqual({
      itemType: "WORD",
      itemId: "pl-hr:42",
    });
    expect(reviewIdentity("pl-hr", "pl-hr:verb:biti:ja").itemType).toBe("VERB");
    expect(reviewIdentity("pl-en", "42").itemId).not.toBe(
      reviewIdentity("pl-hr", "42").itemId,
    );
  });
  it("counts calendar-day activity, including errors, deduplicating days and respecting Warsaw midnight", () => {
    expect(
      streakFromDays(["2026-09-09", "2026-09-10", "2026-09-10"], now),
    ).toEqual({ currentStreak: 2, longestStreak: 2 });
    expect(streakFromDays(["2026-09-09"], now).currentStreak).toBe(0);
    expect(
      streakFromDays(["2026-09-10"], new Date("2026-09-11T22:01:00Z"))
        .currentStreak,
    ).toBe(0);
    expect(streakFromDays([], now)).toEqual({
      currentStreak: 0,
      longestStreak: 0,
    });
  });
});
