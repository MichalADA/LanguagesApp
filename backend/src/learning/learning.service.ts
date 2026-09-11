import { randomUUID } from "node:crypto";
import { ReviewsService } from "../reviews/reviews.service";
import { reviewIdentity } from "../reviews/review-identity";
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ProgressService } from "../progress/progress.service";
import type { RecordAnswerDto } from "./dto/record-answer.dto";

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly reviews: ReviewsService,
  ) {}

  async listSessions(userId: string) {
    return this.prisma.learningSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
  }

  async startSession(userId: string, courseKey: string) {
    const course = await this.resolveCourse(courseKey);
    return this.prisma.learningSession.create({
      data: { userId, courseId: course.id },
    });
  }

  async recordAnswer(userId: string, sessionId: string, dto: RecordAnswerDto) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.reviews.lock(tx, userId);
        const session = await tx.learningSession.findUnique({
          where: { id: sessionId },
        });
        if (!session) throw new NotFoundException("Session not found");
        if (session.userId !== userId) throw new ForbiddenException();
        if (session.finishedAt) {
          if (
            !dto.eventId ||
            !(await tx.reviewAttempt.findUnique({
              where: { userId_eventId: { userId, eventId: dto.eventId } },
            }))
          )
            throw new ConflictException("Session is already finished");
        }
        const course = await tx.course.findUniqueOrThrow({
          where: { id: session.courseId },
        });
        const identity = reviewIdentity(course.slug, dto.wordRef);
        const result = await this.reviews.record(tx, userId, session.courseId, {
          ...dto,
          ...identity,
          eventId: dto.eventId ?? randomUUID(),
          gameType: dto.gameType ?? "legacy-game",
        });
        if (result.duplicate) return session;

        const claimed = await tx.learningSession.updateMany({
          where: { id: session.id, userId, finishedAt: null },
          data: {
            totalAnswers: { increment: 1 },
            correctAnswers: { increment: dto.correct ? 1 : 0 },
            wrongAnswers: { increment: dto.correct ? 0 : 1 },
          },
        });
        if (claimed.count !== 1)
          throw new ConflictException("Session is already finished");

        await tx.learningAnswer.create({
          data: {
            sessionId: session.id,
            userId,
            wordRef: dto.wordRef,
            answer: dto.answer,
            correct: dto.correct,
          },
        });
        return tx.learningSession.findUniqueOrThrow({
          where: { id: session.id },
        });
      },
      { maxWait: 15000, timeout: 20000 },
    );
  }

  async finishSession(userId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.reviews.lock(tx, userId);
      const session = await tx.learningSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) throw new NotFoundException("Session not found");
      if (session.userId !== userId) throw new ForbiddenException();
      if (session.finishedAt) return session;

      const claimed = await tx.learningSession.updateMany({
        where: { id: session.id, userId, finishedAt: null },
        data: { finishedAt: new Date() },
      });
      if (claimed.count !== 1) {
        return tx.learningSession.findUniqueOrThrow({
          where: { id: session.id },
        });
      }

      const finished = await tx.learningSession.findUniqueOrThrow({
        where: { id: session.id },
      });
      await this.progress.recordSessionRollup(
        {
          userId,
          courseId: session.courseId,
          correct: finished.correctAnswers,
          wrong: finished.wrongAnswers,
          streakOnSuccess:
            finished.correctAnswers > 0 && finished.wrongAnswers === 0,
        },
        tx,
      );
      return finished;
    });
  }

  private async resolveCourse(courseKey: string) {
    const course =
      (await this.prisma.course.findUnique({ where: { slug: courseKey } })) ??
      (await this.prisma.course.findUnique({ where: { id: courseKey } }));
    if (!course) throw new NotFoundException("Course not found");
    return course;
  }
}
