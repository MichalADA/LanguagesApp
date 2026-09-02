import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import type { RecordAnswerDto } from './dto/record-answer.dto';

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  async listSessions(userId: string) {
    return this.prisma.learningSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
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
    const session = await this.ensureOwnedSession(userId, sessionId);
    const [, updated] = await this.prisma.$transaction([
      this.prisma.learningAnswer.create({
        data: {
          sessionId: session.id,
          userId,
          wordRef: dto.wordRef,
          answer: dto.answer,
          correct: dto.correct,
        },
      }),
      this.prisma.learningSession.update({
        where: { id: session.id },
        data: {
          totalAnswers: { increment: 1 },
          correctAnswers: { increment: dto.correct ? 1 : 0 },
          wrongAnswers: { increment: dto.correct ? 0 : 1 },
        },
      }),
    ]);
    return updated;
  }

  async finishSession(userId: string, sessionId: string) {
    const session = await this.ensureOwnedSession(userId, sessionId);
    if (session.finishedAt) return session;
    const finished = await this.prisma.learningSession.update({
      where: { id: session.id },
      data: { finishedAt: new Date() },
    });
    await this.progress.recordSessionRollup({
      userId,
      courseId: session.courseId,
      correct: finished.correctAnswers,
      wrong: finished.wrongAnswers,
      streakOnSuccess: finished.correctAnswers > 0 && finished.wrongAnswers === 0,
    });
    return finished;
  }

  private async ensureOwnedSession(userId: string, sessionId: string) {
    const session = await this.prisma.learningSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException();
    return session;
  }

  private async resolveCourse(courseKey: string) {
    const course =
      (await this.prisma.course.findUnique({ where: { slug: courseKey } })) ??
      (await this.prisma.course.findUnique({ where: { id: courseKey } }));
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }
}
