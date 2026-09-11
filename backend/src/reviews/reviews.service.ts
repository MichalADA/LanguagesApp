import { masteredStateWhere } from "./fsrs-scheduler";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ReviewItemType, type ReviewState } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { calculateReviewRating } from "./rating-mapper";
import { reviewStatus, schedule, SCHEDULER_VERSION } from "./fsrs-scheduler";
import type { ReviewAnswerDto } from "./review.dto";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async course(key: string) {
    const row = await this.prisma.course.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
    });
    if (!row) throw new NotFoundException("Course not found");
    return row;
  }

  async answer(userId: string, dto: ReviewAnswerDto) {
    const course = await this.course(dto.course);
    return this.prisma.$transaction(
      async (tx) => {
        await this.lock(tx, userId);
        if (dto.sessionId) {
          const session = await tx.learningSession.findUnique({
            where: { id: dto.sessionId },
          });
          if (!session) throw new NotFoundException("Session not found");
          if (session.userId !== userId || session.courseId !== course.id)
            throw new ForbiddenException();
          if (session.finishedAt) {
            const previous = await tx.reviewAttempt.findUnique({
              where: { userId_eventId: { userId, eventId: dto.eventId } },
            });
            if (!previous)
              throw new ConflictException("Session is already finished");
          }
        }
        const result = await this.record(tx, userId, course.id, dto);
        if (dto.sessionId && !result.duplicate)
          await tx.learningSession.update({
            where: { id: dto.sessionId },
            data: {
              totalAnswers: { increment: 1 },
              correctAnswers: { increment: dto.correct ? 1 : 0 },
              wrongAnswers: { increment: dto.correct ? 0 : 1 },
            },
          });
        return result;
      },
      { maxWait: 15000, timeout: 20000 },
    );
  }

  /** Acquire before any session/state write. Serializes attempts across devices and games. */
  async lock(tx: Prisma.TransactionClient, userId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
  }

  async record(
    tx: Prisma.TransactionClient,
    userId: string,
    courseId: string,
    dto: Omit<ReviewAnswerDto, "course">,
  ) {
    await this.lock(tx, userId);
    const existing = await tx.reviewAttempt.findUnique({
      where: { userId_eventId: { userId, eventId: dto.eventId } },
    });
    if (existing) {
      if (
        existing.itemId !== dto.itemId ||
        existing.itemType !== dto.itemType ||
        existing.courseId !== courseId ||
        existing.gameType !== dto.gameType ||
        existing.answer !== dto.answer ||
        existing.correct !== dto.correct ||
        existing.direction !== (dto.direction ?? null) ||
        existing.responseTimeMs !== (dto.responseTimeMs ?? null) ||
        existing.usedHint !== (dto.usedHint ?? false) ||
        existing.attemptsBeforeCorrect !== (dto.attemptsBeforeCorrect ?? 0)
      )
        throw new ConflictException(
          "Event id was already used for another answer",
        );
      return {
        duplicate: true,
        attempt: existing,
        review: await tx.reviewState.findUniqueOrThrow({
          where: { id: existing.reviewStateId },
        }),
      };
    }
    const course = await tx.course.findUniqueOrThrow({
      where: { id: courseId },
    });
    if (!dto.itemId.startsWith(`${course.slug}:`))
      throw new BadRequestException("Item must be namespaced by its course");
    const now = new Date();
    const before = await tx.reviewState.upsert({
      where: {
        userId_itemType_itemId: {
          userId,
          itemType: dto.itemType,
          itemId: dto.itemId,
        },
      },
      create: { userId, courseId, itemType: dto.itemType, itemId: dto.itemId },
      update: {},
    });
    const rating = calculateReviewRating(dto, before.stability);
    const next = schedule(before, rating, now);
    const review = await tx.reviewState.update({
      where: { id: before.id },
      data: {
        state: next.state,
        stability: next.stability,
        difficulty: next.difficulty,
        due: next.due,
        lastReview: next.last_review,
        scheduledDays: next.scheduled_days,
        elapsedDays: next.elapsed_days,
        learningSteps: next.learning_steps,
        reps: next.reps,
        lapses: next.lapses,
        correctAnswers: { increment: dto.correct ? 1 : 0 },
        wrongAnswers: { increment: dto.correct ? 0 : 1 },
      },
    });
    const attempt = await tx.reviewAttempt.create({
      data: {
        userId,
        courseId,
        reviewStateId: review.id,
        itemId: dto.itemId,
        itemType: dto.itemType,
        eventId: dto.eventId,
        gameType: dto.gameType,
        direction: dto.direction,
        answer: dto.answer,
        timestamp: now,
        correct: dto.correct,
        rating,
        responseTimeMs: dto.responseTimeMs,
        usedHint: dto.usedHint ?? false,
        attemptsBeforeCorrect: dto.attemptsBeforeCorrect ?? 0,
        previousDue: before.due,
        nextDue: review.due,
        previousStability: before.stability,
        newStability: review.stability,
        previousDifficulty: before.difficulty,
        newDifficulty: review.difficulty,
        schedulerVersion: SCHEDULER_VERSION,
      },
    });
    return { duplicate: false, attempt, review };
  }

  async seen(
    userId: string,
    courseId: string,
    itemType: ReviewItemType,
    itemId: string,
  ) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
    });
    if (!itemId.startsWith(`${course.slug}:`))
      throw new BadRequestException("Item must belong to the course");
    return this.prisma.reviewState.upsert({
      where: { userId_itemType_itemId: { userId, itemType, itemId } },
      create: { userId, courseId, itemType, itemId },
      update: {},
    });
  }

  async due(
    userId: string,
    filter: {
      course?: string;
      language?: string;
      itemType?: ReviewItemType;
      limit?: number;
    },
  ) {
    const courseId = filter.course
      ? (await this.course(filter.course)).id
      : undefined;
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    return this.prisma.reviewState.findMany({
      where: {
        userId,
        due: { lte: new Date() },
        ...(courseId ? { courseId } : {}),
        ...(filter.itemType ? { itemType: filter.itemType } : {}),
        ...(filter.language
          ? { course: { targetLanguage: { code: filter.language } } }
          : {}),
      },
      orderBy: [{ due: "asc" }, { id: "asc" }],
      take: limit,
      include: { course: { select: { slug: true } } },
    });
  }

  async progress(userId: string, courseKey: string, cursor?: string) {
    const course = await this.course(courseKey);
    const rows = await this.prisma.reviewState.findMany({
      where: {
        userId,
        courseId: course.id,
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      orderBy: { id: "asc" },
      take: 501,
    });
    const items = rows
      .slice(0, 500)
      .map((row) => ({ ...this.card(row), itemType: row.itemType }));
    return { items, cursor: rows.length > 500 ? rows[499].id : null };
  }

  async stats(userId: string, courseKey?: string) {
    const courseId = courseKey ? (await this.course(courseKey)).id : undefined;
    const where = { userId, ...(courseId ? { courseId } : {}) };
    const now = new Date(),
      seven = new Date(now.getTime() - 7 * 86400000),
      thirty = new Date(now.getTime() - 30 * 86400000);
    const mastered = masteredStateWhere;
    const [
      seen,
      fresh,
      masteredCount,
      due,
      overdue,
      grouped,
      recent,
      forecast,
      hardest,
    ] = await Promise.all([
      this.prisma.reviewState.count({ where }),
      this.prisma.reviewState.count({ where: { ...where, reps: 0 } }),
      this.prisma.reviewState.count({ where: { ...where, ...mastered } }),
      this.prisma.reviewState.count({ where: { ...where, due: { lte: now } } }),
      this.prisma.reviewState.count({
        where: { ...where, due: { lt: new Date(now.getTime() - 86400000) } },
      }),
      this.prisma.reviewAttempt.groupBy({
        by: ["gameType", "direction", "correct"],
        where,
        _count: true,
        _avg: { responseTimeMs: true },
      }),
      this.prisma.reviewAttempt.groupBy({
        by: ["correct"],
        where: { ...where, timestamp: { gte: thirty } },
        _count: true,
      }),
      this.prisma.$queryRaw<
        Array<{ day: string; count: bigint }>
      >`SELECT to_char("due" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Warsaw', 'YYYY-MM-DD') AS day, count(*) AS count FROM "ReviewState" WHERE "userId"=${userId} AND (${courseId ?? null}::text IS NULL OR "courseId"=${courseId ?? null}) AND "due">${now} AND "due"<=${new Date(now.getTime() + 7 * 86400000)} GROUP BY day ORDER BY day`,
      this.prisma.reviewState.findMany({
        where: { ...where, itemType: "WORD", lapses: { gt: 0 } },
        orderBy: [{ lapses: "desc" }, { difficulty: "desc" }],
        take: 10,
      }),
    ]);
    const last7 = await this.prisma.reviewAttempt.groupBy({
      by: ["correct"],
      where: { ...where, timestamp: { gte: seven } },
      _count: true,
    });
    const accuracy = (rows: { correct: boolean; _count: number }[]) => {
      const n = rows.reduce((sum, row) => sum + row._count, 0);
      return n
        ? Math.round(
            (100 *
              rows
                .filter((row) => row.correct)
                .reduce((sum, row) => sum + row._count, 0)) /
              n,
          )
        : null;
    };
    return {
      seen,
      new: fresh,
      learning: seen - fresh - masteredCount,
      mastered: masteredCount,
      due,
      overdue,
      accuracy7: accuracy(last7),
      accuracy30: accuracy(recent),
      totalAnswers: grouped.reduce((n, row) => n + row._count, 0),
      wrongAnswers: grouped
        .filter((row) => !row.correct)
        .reduce((n, row) => n + row._count, 0),
      byGameAndDirection: grouped,
      forecast: forecast.map((row) => ({ ...row, count: Number(row.count) })),
      hardest,
    };
  }

  card(row: ReviewState) {
    return {
      wordRef: row.itemId,
      status: reviewStatus(row),
      repetitions: row.reps,
      correctAnswers: row.correctAnswers,
      wrongAnswers: row.wrongAnswers,
      intervalDays: row.scheduledDays,
      easeFactor: 2.5,
      nextReviewAt: row.due.toISOString(),
      lastReviewedAt: row.lastReview?.toISOString() ?? null,
      firstSeenAt: row.createdAt.toISOString(),
      masteredAt:
        reviewStatus(row) === "MASTERED" ? row.lastReview?.toISOString() : null,
      difficultyScore: row.lapses,
      markedDifficult: row.markedDifficult,
      isDue: row.due <= new Date(),
      isNew: row.reps === 0,
    };
  }
}
