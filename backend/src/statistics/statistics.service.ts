import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface StatisticsResponse {
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

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string, courseFilter?: string): Promise<StatisticsResponse> {
    const courseId = courseFilter ? await this.resolveCourseId(courseFilter) : undefined;

    const sessionWhere = {
      userId,
      finishedAt: { not: null },
      ...(courseId ? { courseId } : {}),
    };
    const totalSessions = await this.prisma.learningSession.count({ where: sessionWhere });

    const progressWhere = { userId, ...(courseId ? { courseId } : {}) };
    const progressRows = await this.prisma.userCourseProgress.findMany({ where: progressWhere });

    const totals = progressRows.reduce(
      (acc, row) => {
        acc.totalAnswers += row.totalAnswers;
        acc.correctAnswers += row.correctAnswers;
        acc.wrongAnswers += row.wrongAnswers;
        acc.wordsLearned += row.wordsLearned;
        acc.currentStreak = Math.max(acc.currentStreak, row.currentStreak);
        acc.longestStreak = Math.max(acc.longestStreak, row.longestStreak);
        return acc;
      },
      {
        totalAnswers: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        wordsLearned: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
    );

    const accuracy = totals.totalAnswers > 0
      ? Math.round((totals.correctAnswers / totals.totalAnswers) * 10_000) / 100
      : 0;

    return {
      courseId: courseId ?? null,
      totalSessions,
      totalAnswers: totals.totalAnswers,
      correctAnswers: totals.correctAnswers,
      wrongAnswers: totals.wrongAnswers,
      accuracy,
      wordsLearned: totals.wordsLearned,
      currentStreak: totals.currentStreak,
      longestStreak: totals.longestStreak,
    };
  }

  private async resolveCourseId(key: string): Promise<string> {
    const bySlug = await this.prisma.course.findUnique({ where: { slug: key } });
    if (bySlug) return bySlug.id;
    const byId = await this.prisma.course.findUnique({ where: { id: key } });
    if (!byId) throw new NotFoundException('Course not found');
    return byId.id;
  }
}
