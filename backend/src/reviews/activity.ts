import { Prisma } from "@prisma/client";

/** Calendar days in the application's default time zone, not error-free sessions. */
export async function activityStreak(
  db: Prisma.TransactionClient,
  userId: string,
  courseId?: string,
) {
  const rows = await db.$queryRaw<Array<{ day: string }>>`
    SELECT DISTINCT to_char(at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Warsaw','YYYY-MM-DD') AS day FROM (
      SELECT "timestamp" AS at FROM "ReviewAttempt" WHERE "userId"=${userId} AND (${courseId ?? null}::text IS NULL OR "courseId"=${courseId ?? null})
      UNION ALL SELECT "finishedAt" AS at FROM "LearningSession" WHERE "userId"=${userId} AND "totalAnswers">0 AND "finishedAt" IS NOT NULL AND (${courseId ?? null}::text IS NULL OR "courseId"=${courseId ?? null})
      UNION ALL SELECT "finishedAt" AS at FROM "FlashcardSession" WHERE "userId"=${userId} AND "totalAnswers">0 AND "finishedAt" IS NOT NULL AND (${courseId ?? null}::text IS NULL OR "courseId"=${courseId ?? null})
    ) activity ORDER BY day`;
  return streakFromDays(rows.map((r) => r.day));
}
export function streakFromDays(days: string[], now = new Date()) {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const number = (day: string) =>
    Math.floor(Date.parse(day + "T00:00:00Z") / 86400000);
  const values = [...new Set(days.map(number))].sort((a, b) => a - b);
  let run = 0,
    longestStreak = 0,
    previous = -Infinity;
  for (const day of values) {
    run = day === previous + 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }
  return {
    currentStreak:
      previous >= number(today) - 1 && previous <= number(today) ? run : 0,
    longestStreak,
  };
}
