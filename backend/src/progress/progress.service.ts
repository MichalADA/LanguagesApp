import { masteredStateWhere } from "../reviews/fsrs-scheduler";
import { activityStreak } from "../reviews/activity";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type DatabaseClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Progress for the authenticated user grouped by course.
   * Every row is filtered by userId — no cross-user leakage is possible.
   */
  async listForUser(userId: string) {
    const rows = await this.prisma.userCourseProgress.findMany({
      where: { userId },
      include: {
        course: { include: { sourceLanguage: true, targetLanguage: true } },
      },
      orderBy: { lastActivityAt: "desc" },
    });
    return Promise.all(
      rows.map(async (row) => ({
        courseId: row.courseId,
        courseSlug: row.course.slug,
        courseName: row.course.name,
        sourceLanguage: row.course.sourceLanguage,
        targetLanguage: row.course.targetLanguage,
        startedAt: row.startedAt,
        lastActivityAt: row.lastActivityAt,
        totalAnswers: row.totalAnswers,
        correctAnswers: row.correctAnswers,
        wrongAnswers: row.wrongAnswers,
        wordsLearned: await this.countMasteredItems(
          this.prisma,
          userId,
          row.courseId,
        ),
        ...(await activityStreak(this.prisma, userId, row.courseId)),
      })),
    );
  }

  async getForCourse(userId: string, courseId: string) {
    const row = await this.prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        course: { include: { sourceLanguage: true, targetLanguage: true } },
      },
    });
    if (!row) throw new NotFoundException("No progress for this course yet");
    return {
      ...row,
      wordsLearned: await this.countMasteredItems(
        this.prisma,
        userId,
        courseId,
      ),
      ...(await activityStreak(this.prisma, userId, courseId)),
    };
  }

  /**
   * Upsert progress for a user on a course. Called after a learning session
   * finishes. It can participate in the caller's transaction so marking a
   * session finished and updating aggregate progress stay atomic.
   */
  async recordSessionRollup(
    input: {
      userId: string;
      courseId: string;
      correct: number;
      wrong: number;
      streakOnSuccess?: boolean;
    },
    db: DatabaseClient = this.prisma,
  ) {
    const { userId, courseId, correct, wrong } = input;
    const total = correct + wrong;
    const { currentStreak: newStreak, longestStreak: longest } =
      await activityStreak(db, userId, courseId);
    const wordsLearned = await this.countMasteredItems(db, userId, courseId);

    return db.userCourseProgress.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {
        lastActivityAt: new Date(),
        totalAnswers: { increment: total },
        correctAnswers: { increment: correct },
        wrongAnswers: { increment: wrong },
        wordsLearned,
        currentStreak: newStreak,
        longestStreak: longest,
      },
      create: {
        userId,
        courseId,
        totalAnswers: total,
        correctAnswers: correct,
        wrongAnswers: wrong,
        wordsLearned,
        currentStreak: newStreak,
        longestStreak: longest,
      },
    });
  }

  private async countMasteredItems(
    db: DatabaseClient,
    userId: string,
    courseId: string,
  ): Promise<number> {
    return db.reviewState.count({
      where: { userId, courseId, itemType: "WORD", ...masteredStateWhere },
    });
  }
}
