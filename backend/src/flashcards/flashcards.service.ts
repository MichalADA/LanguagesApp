import { activityStreak } from "../reviews/activity";
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { ReviewsService } from "../reviews/reviews.service";
import { ProgressService } from "../progress/progress.service";
import { reviewStatus } from "../reviews/fsrs-scheduler";
import type {
  SeenWordDto,
  StartFlashcardSessionDto,
  SubmitAnswerDto,
  ToggleDifficultDto,
} from "./dto/answer.dto";

/** Compatibility facade: all live scheduling and word state now come from ReviewsService. */
@Injectable()
export class FlashcardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
    private readonly progress: ProgressService,
  ) {}

  async summary(userId: string, courseKey: string) {
    const course = await this.reviews.course(courseKey);
    const rows = await this.prisma.reviewState.findMany({
      where: { userId, courseId: course.id, itemType: "WORD" },
    });
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const correct = rows.reduce((n, r) => n + r.correctAnswers, 0),
      wrong = rows.reduce((n, r) => n + r.wrongAnswers, 0);
    return {
      courseId: course.id,
      totalKnown: rows.length,
      seenTotal: rows.length,
      newToday: rows.filter((r) => r.createdAt >= today).length,
      reviewDue: rows.filter((r) => r.due <= new Date()).length,
      mastered: rows.filter((r) => reviewStatus(r) === "MASTERED").length,
      learning: rows.filter((r) =>
        ["LEARNING", "REVIEW"].includes(reviewStatus(r)),
      ).length,
      difficult: rows.filter((r) => r.markedDifficult || r.lapses > 0).length,
      ...(await activityStreak(this.prisma, userId, course.id)),
      attempts: correct + wrong,
      correct,
      wrong,
      accuracy:
        correct + wrong ? Math.round((correct / (correct + wrong)) * 100) : 0,
    };
  }
  async listProgress(userId: string, courseKey: string) {
    const course = await this.reviews.course(courseKey);
    const rows = await this.prisma.reviewState.findMany({
      where: { userId, courseId: course.id, itemType: "WORD" },
      orderBy: { due: "asc" },
    });
    return rows.map((row) => this.reviews.card(row));
  }
  async reviewQueue(userId: string, courseKey: string, limit: number) {
    return (
      await this.reviews.due(userId, {
        course: courseKey,
        itemType: "WORD",
        limit: Number.isFinite(limit) ? limit : 20,
      })
    ).map((row) => this.reviews.card(row));
  }
  async difficultQueue(userId: string, courseKey: string, limit: number) {
    const course = await this.reviews.course(courseKey);
    return (
      await this.prisma.reviewState.findMany({
        where: {
          userId,
          courseId: course.id,
          itemType: "WORD",
          OR: [{ markedDifficult: true }, { lapses: { gt: 0 } }],
        },
        orderBy: [{ lapses: "desc" }, { due: "asc" }],
        take: Math.max(1, Math.min(Number.isFinite(limit) ? limit : 20, 100)),
      })
    ).map((row) => this.reviews.card(row));
  }
  async markSeen(userId: string, dto: SeenWordDto) {
    const course = await this.reviews.course(dto.course);
    return this.reviews.card(
      await this.reviews.seen(userId, course.id, "WORD", dto.wordRef),
    );
  }
  async toggleDifficult(userId: string, dto: ToggleDifficultDto) {
    const course = await this.reviews.course(dto.course);
    const row = await this.reviews.seen(userId, course.id, "WORD", dto.wordRef);
    return this.reviews.card(
      await this.prisma.reviewState.update({
        where: { id: row.id },
        data: { markedDifficult: dto.markedDifficult },
      }),
    );
  }
  async submitAnswer(userId: string, dto: SubmitAnswerDto) {
    const course = await this.reviews.course(dto.course);
    return this.prisma.$transaction(
      async (tx) => {
        await this.reviews.lock(tx, userId);
        const prior = dto.eventId
          ? await tx.reviewAttempt.findUnique({
              where: { userId_eventId: { userId, eventId: dto.eventId } },
            })
          : null;
        if (dto.sessionId) {
          const session = await tx.flashcardSession.findUnique({
            where: { id: dto.sessionId },
          });
          if (!session) throw new NotFoundException("Session not found");
          if (session.userId !== userId || session.courseId !== course.id)
            throw new ForbiddenException();
          if (session.finishedAt && !prior)
            throw new ConflictException("Session is already finished");
        }
        const result = await this.reviews.record(tx, userId, course.id, {
          itemType: "WORD",
          itemId: dto.wordRef,
          eventId: dto.eventId ?? randomUUID(),
          gameType: "flashcards",
          direction: dto.direction,
          answer: dto.answer,
          correct: dto.correct,
          usedHint: dto.usedHint ?? false,
          responseTimeMs: dto.responseTimeMs,
          attemptsBeforeCorrect: dto.attemptsBeforeCorrect,
        });
        if (dto.sessionId && !result.duplicate)
          await tx.flashcardSession.update({
            where: { id: dto.sessionId },
            data: {
              totalAnswers: { increment: 1 },
              correctAnswers: { increment: dto.correct ? 1 : 0 },
              wrongAnswers: { increment: dto.correct ? 0 : 1 },
              newWords: { increment: result.review.reps === 1 ? 1 : 0 },
            },
          });
        return {
          card: this.reviews.card(result.review),
          sessionId: dto.sessionId ?? null,
        };
      },
      { maxWait: 15000, timeout: 20000 },
    );
  }
  async startSession(userId: string, dto: StartFlashcardSessionDto) {
    const course = await this.reviews.course(dto.course);
    return this.prisma.flashcardSession.create({
      data: {
        userId,
        courseId: course.id,
        mode: dto.mode,
        direction: dto.direction,
      },
    });
  }
  async finishSession(userId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.reviews.lock(tx, userId);
      const session = await tx.flashcardSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) throw new NotFoundException("Session not found");
      if (session.userId !== userId) throw new ForbiddenException();
      if (session.finishedAt) return session;
      const finished = await tx.flashcardSession.update({
        where: { id: sessionId },
        data: { finishedAt: new Date() },
      });
      if (session.totalAnswers)
        await this.progress.recordSessionRollup(
          {
            userId,
            courseId: session.courseId,
            correct: session.correctAnswers,
            wrong: session.wrongAnswers,
          },
          tx,
        );
      return finished;
    });
  }
}
