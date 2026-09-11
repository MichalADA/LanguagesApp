import { masteredStateWhere } from "../reviews/fsrs-scheduler";
import { activityStreak } from "../reviews/activity";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

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

  async forUser(
    userId: string,
    courseFilter?: string,
  ): Promise<StatisticsResponse> {
    const courseId = courseFilter
      ? await this.resolveCourseId(courseFilter)
      : undefined;

    const sessionWhere = {
      userId,
      finishedAt: { not: null },
      ...(courseId ? { courseId } : {}),
    };
    const aggregate = {
      where: sessionWhere,
      _count: true,
      _sum: { totalAnswers: true, correctAnswers: true, wrongAnswers: true },
    } as const;
    const [games, cards] = await Promise.all([
      this.prisma.learningSession.aggregate(aggregate),
      this.prisma.flashcardSession.aggregate(aggregate),
    ]);
    const totalSessions = games._count + cards._count;
    const totals = {
      totalAnswers:
        (games._sum.totalAnswers ?? 0) + (cards._sum.totalAnswers ?? 0),
      correctAnswers:
        (games._sum.correctAnswers ?? 0) + (cards._sum.correctAnswers ?? 0),
      wrongAnswers:
        (games._sum.wrongAnswers ?? 0) + (cards._sum.wrongAnswers ?? 0),
      wordsLearned: 0,
      currentStreak: 0,
      longestStreak: 0,
    };

    totals.wordsLearned = await this.prisma.reviewState.count({
      where: {
        userId,
        ...(courseId ? { courseId } : {}),
        itemType: "WORD",
        ...masteredStateWhere,
      },
    });
    Object.assign(totals, await activityStreak(this.prisma, userId, courseId));
    const accuracy =
      totals.totalAnswers > 0
        ? Math.round((totals.correctAnswers / totals.totalAnswers) * 10_000) /
          100
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
    const bySlug = await this.prisma.course.findUnique({
      where: { slug: key },
    });
    if (bySlug) return bySlug.id;
    const byId = await this.prisma.course.findUnique({ where: { id: key } });
    if (!byId) throw new NotFoundException("Course not found");
    return byId.id;
  }
}
