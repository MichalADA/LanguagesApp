import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WordStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  DIFFICULTY_THRESHOLD,
  MASTERY_INTERVAL_DAYS,
  MASTERY_MIN_REPETITIONS,
  scheduleNext,
  type FlashcardRating,
} from './srs';
import type {
  SeenWordDto,
  StartFlashcardSessionDto,
  SubmitAnswerDto,
  ToggleDifficultDto,
} from './dto/answer.dto';

const NEW_WORDS_PER_DAY_DEFAULT = 20;

export interface FlashcardsSummary {
  courseId: string;
  totalKnown: number;
  newToday: number;
  reviewDue: number;
  mastered: number;
  learning: number;
  difficult: number;
  seenTotal: number;
  currentStreak: number;
  longestStreak: number;
  attempts: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

export interface CardPayload {
  wordRef: string;
  status: WordStatus;
  repetitions: number;
  correctAnswers: number;
  wrongAnswers: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  firstSeenAt: string;
  masteredAt: string | null;
  difficultyScore: number;
  markedDifficult: boolean;
  isDue: boolean;
  isNew: boolean;
}

@Injectable()
export class FlashcardsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, courseKey: string): Promise<FlashcardsSummary> {
    const course = await this.resolveCourse(courseKey);
    const now = new Date();

    const rows = await this.prisma.userWordProgress.findMany({
      where: { userId, courseId: course.id },
      select: {
        status: true,
        correctAnswers: true,
        wrongAnswers: true,
        nextReviewAt: true,
        firstSeenAt: true,
        markedDifficult: true,
      },
    });

    const startOfToday = startOfDay(now);

    let totalKnown = 0;
    let seenTotal = 0;
    let mastered = 0;
    let learning = 0;
    let review = 0;
    let difficult = 0;
    let newToday = 0;
    let reviewDue = 0;
    let attempts = 0;
    let correct = 0;
    let wrong = 0;

    for (const row of rows) {
      totalKnown += 1;
      seenTotal += 1;
      attempts += row.correctAnswers + row.wrongAnswers;
      correct += row.correctAnswers;
      wrong += row.wrongAnswers;
      if (row.firstSeenAt >= startOfToday) newToday += 1;
      switch (row.status) {
        case 'MASTERED':
          mastered += 1;
          break;
        case 'LEARNING':
          learning += 1;
          break;
        case 'REVIEW':
          review += 1;
          break;
        case 'DIFFICULT':
          difficult += 1;
          break;
        default:
          break;
      }
      if (row.markedDifficult && row.status !== 'DIFFICULT') difficult += 1;
      if (row.status !== 'NEW' && row.nextReviewAt <= now) reviewDue += 1;
    }

    const courseProgress = await this.prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
      select: { currentStreak: true, longestStreak: true },
    });

    const accuracy = attempts > 0 ? Math.round((correct / attempts) * 10_000) / 100 : 0;

    return {
      courseId: course.id,
      totalKnown,
      newToday,
      reviewDue,
      mastered,
      // Everything the user is actively drilling but has not mastered yet.
      learning: learning + review,
      difficult,
      seenTotal,
      currentStreak: courseProgress?.currentStreak ?? 0,
      longestStreak: courseProgress?.longestStreak ?? 0,
      attempts,
      correct,
      wrong,
      accuracy,
    };
  }

  /**
   * The frontend owns the CSV — the backend cannot enumerate words on its own.
   * This endpoint returns:
   *   • all wordRefs whose review is due,
   *   • all wordRefs marked as DIFFICULT / DIFFICULT-flagged,
   *   • plus every row the user has ever seen, so the client can filter its
   *     CSV to compute "which ranks are still NEW".
   */
  async listProgress(userId: string, courseKey: string): Promise<CardPayload[]> {
    const course = await this.resolveCourse(courseKey);
    const rows = await this.prisma.userWordProgress.findMany({
      where: { userId, courseId: course.id },
      orderBy: { nextReviewAt: 'asc' },
    });
    return rows.map((row) => this.toCard(row));
  }

  async reviewQueue(
    userId: string,
    courseKey: string,
    limit: number,
  ): Promise<CardPayload[]> {
    const course = await this.resolveCourse(courseKey);
    const rows = await this.prisma.userWordProgress.findMany({
      where: {
        userId,
        courseId: course.id,
        nextReviewAt: { lte: new Date() },
        status: { in: ['LEARNING', 'REVIEW', 'DIFFICULT', 'MASTERED'] },
      },
      orderBy: [{ nextReviewAt: 'asc' }, { difficultyScore: 'desc' }],
      take: clampLimit(limit),
    });
    return rows.map((row) => this.toCard(row));
  }

  async difficultQueue(
    userId: string,
    courseKey: string,
    limit: number,
  ): Promise<CardPayload[]> {
    const course = await this.resolveCourse(courseKey);
    const rows = await this.prisma.userWordProgress.findMany({
      where: {
        userId,
        courseId: course.id,
        OR: [{ status: 'DIFFICULT' }, { markedDifficult: true }],
      },
      orderBy: [{ difficultyScore: 'desc' }, { nextReviewAt: 'asc' }],
      take: clampLimit(limit),
    });
    return rows.map((row) => this.toCard(row));
  }

  /** Marks a word as seen (games call this) — does NOT count as a rep. */
  async markSeen(userId: string, dto: SeenWordDto): Promise<CardPayload> {
    const course = await this.resolveCourse(dto.course);
    const row = await this.prisma.userWordProgress.upsert({
      where: {
        userId_courseId_wordRef: {
          userId,
          courseId: course.id,
          wordRef: dto.wordRef,
        },
      },
      update: {}, // present already → keep firstSeenAt as-is
      create: {
        userId,
        courseId: course.id,
        wordRef: dto.wordRef,
        status: 'NEW',
      },
    });
    return this.toCard(row);
  }

  async toggleDifficult(userId: string, dto: ToggleDifficultDto): Promise<CardPayload> {
    const course = await this.resolveCourse(dto.course);
    const row = await this.prisma.userWordProgress.upsert({
      where: {
        userId_courseId_wordRef: {
          userId,
          courseId: course.id,
          wordRef: dto.wordRef,
        },
      },
      update: {
        markedDifficult: dto.markedDifficult,
        status: dto.markedDifficult ? 'DIFFICULT' : undefined,
      },
      create: {
        userId,
        courseId: course.id,
        wordRef: dto.wordRef,
        status: dto.markedDifficult ? 'DIFFICULT' : 'NEW',
        markedDifficult: dto.markedDifficult,
      },
    });
    return this.toCard(row);
  }

  async submitAnswer(
    userId: string,
    dto: SubmitAnswerDto,
  ): Promise<{ card: CardPayload; sessionId: string | null }> {
    const course = await this.resolveCourse(dto.course);
    const rating = dto.rating as FlashcardRating;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.userWordProgress.findUnique({
        where: {
          userId_courseId_wordRef: {
            userId,
            courseId: course.id,
            wordRef: dto.wordRef,
          },
        },
      });

      const previous = existing
        ? {
            repetitions: existing.repetitions,
            easeFactor: existing.easeFactor,
            intervalDays: existing.intervalDays,
          }
        : { repetitions: 0, easeFactor: 2.5, intervalDays: 0 };

      const update = scheduleNext(previous, rating);
      const now = new Date();
      const nextReviewAt = new Date(now.getTime() + update.nextDelayMs);

      const correctIncrement = update.correct ? 1 : 0;
      const wrongIncrement = update.correct ? 0 : 1;

      // difficultyScore mirrors misses; a couple of consecutive AGAINs raises
      // it enough to flip status to DIFFICULT even before the SRS ease drops.
      const nextDifficulty = update.correct
        ? Math.max(0, (existing?.difficultyScore ?? 0) - 1)
        : (existing?.difficultyScore ?? 0) + 2;

      const flagsDifficult =
        existing?.markedDifficult === true || nextDifficulty >= DIFFICULTY_THRESHOLD;
      const nextStatus = deriveStatus({
        previousStatus: existing?.status ?? 'NEW',
        repetitions: update.repetitions,
        intervalDays: update.intervalDays,
        correct: update.correct,
        flagsDifficult,
      });

      const masteredAt =
        nextStatus === 'MASTERED' ? existing?.masteredAt ?? now : null;

      const card = await tx.userWordProgress.upsert({
        where: {
          userId_courseId_wordRef: {
            userId,
            courseId: course.id,
            wordRef: dto.wordRef,
          },
        },
        update: {
          status: nextStatus,
          repetitions: update.repetitions,
          easeFactor: update.easeFactor,
          intervalDays: update.intervalDays,
          nextReviewAt,
          lastReviewedAt: now,
          correctAnswers: { increment: correctIncrement },
          wrongAnswers: { increment: wrongIncrement },
          difficultyScore: nextDifficulty,
          masteredAt,
        },
        create: {
          userId,
          courseId: course.id,
          wordRef: dto.wordRef,
          status: nextStatus,
          repetitions: update.repetitions,
          easeFactor: update.easeFactor,
          intervalDays: update.intervalDays,
          nextReviewAt,
          lastReviewedAt: now,
          firstSeenAt: now,
          correctAnswers: correctIncrement,
          wrongAnswers: wrongIncrement,
          difficultyScore: nextDifficulty,
          masteredAt,
        },
      });

      if (dto.sessionId) {
        await this.recordSessionAnswer(
          tx,
          userId,
          dto.sessionId,
          update.correct,
          !existing,
        );
      }

      return { card: this.toCard(card), sessionId: dto.sessionId ?? null };
    });
  }

  async startSession(userId: string, dto: StartFlashcardSessionDto) {
    const course = await this.resolveCourse(dto.course);
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
      const session = await tx.flashcardSession.findUnique({ where: { id: sessionId } });
      if (!session) throw new NotFoundException('Session not found');
      if (session.userId !== userId) throw new ForbiddenException();
      if (session.finishedAt) return session;

      const updated = await tx.flashcardSession.updateMany({
        where: { id: sessionId, userId, finishedAt: null },
        data: { finishedAt: new Date() },
      });
      if (updated.count !== 1) {
        return tx.flashcardSession.findUniqueOrThrow({ where: { id: sessionId } });
      }

      const fresh = await tx.flashcardSession.findUniqueOrThrow({ where: { id: sessionId } });

      // Roll the finished session into UserCourseProgress so the dashboard
      // aggregates (activeDays, streak, totalAnswers) reflect flashcard work
      // just like game rounds do.
      const streakOnSuccess = fresh.correctAnswers > 0 && fresh.wrongAnswers === 0;
      await this.rollupToCourseProgress(tx, {
        userId,
        courseId: session.courseId,
        correct: fresh.correctAnswers,
        wrong: fresh.wrongAnswers,
        streakOnSuccess,
      });
      return fresh;
    });
  }

  /** Aggregate rollup — kept local to avoid a circular ProgressModule import. */
  private async rollupToCourseProgress(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      courseId: string;
      correct: number;
      wrong: number;
      streakOnSuccess: boolean;
    },
  ) {
    const { userId, courseId, correct, wrong, streakOnSuccess } = input;
    const total = correct + wrong;
    if (total === 0) return;

    const existing = await tx.userCourseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    const newStreak = streakOnSuccess ? (existing?.currentStreak ?? 0) + 1 : 0;
    const longest = Math.max(existing?.longestStreak ?? 0, newStreak);

    // wordsLearned = distinct wordRefs the user has mastered on this course.
    const masteredCount = await tx.userWordProgress.count({
      where: { userId, courseId, status: 'MASTERED' },
    });

    await tx.userCourseProgress.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {
        lastActivityAt: new Date(),
        totalAnswers: { increment: total },
        correctAnswers: { increment: correct },
        wrongAnswers: { increment: wrong },
        wordsLearned: masteredCount,
        currentStreak: newStreak,
        longestStreak: longest,
      },
      create: {
        userId,
        courseId,
        totalAnswers: total,
        correctAnswers: correct,
        wrongAnswers: wrong,
        wordsLearned: masteredCount,
        currentStreak: newStreak,
        longestStreak: newStreak,
      },
    });
  }

  private async recordSessionAnswer(
    tx: Prisma.TransactionClient,
    userId: string,
    sessionId: string,
    correct: boolean,
    isNewWord: boolean,
  ): Promise<void> {
    const session = await tx.flashcardSession.findUnique({ where: { id: sessionId } });
    if (!session) return;
    if (session.userId !== userId) throw new ForbiddenException();
    if (session.finishedAt) throw new ConflictException('Session is already finished');
    await tx.flashcardSession.updateMany({
      where: { id: sessionId, userId, finishedAt: null },
      data: {
        totalAnswers: { increment: 1 },
        correctAnswers: { increment: correct ? 1 : 0 },
        wrongAnswers: { increment: correct ? 0 : 1 },
        newWords: { increment: isNewWord ? 1 : 0 },
      },
    });
  }

  private async resolveCourse(key: string) {
    const course =
      (await this.prisma.course.findUnique({ where: { slug: key } })) ??
      (await this.prisma.course.findUnique({ where: { id: key } }));
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  private toCard(row: {
    wordRef: string;
    status: WordStatus;
    repetitions: number;
    correctAnswers: number;
    wrongAnswers: number;
    intervalDays: number;
    easeFactor: number;
    nextReviewAt: Date;
    lastReviewedAt: Date | null;
    firstSeenAt: Date;
    masteredAt: Date | null;
    difficultyScore: number;
    markedDifficult: boolean;
  }): CardPayload {
    const now = new Date();
    return {
      wordRef: row.wordRef,
      status: row.status,
      repetitions: row.repetitions,
      correctAnswers: row.correctAnswers,
      wrongAnswers: row.wrongAnswers,
      intervalDays: row.intervalDays,
      easeFactor: row.easeFactor,
      nextReviewAt: row.nextReviewAt.toISOString(),
      lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
      firstSeenAt: row.firstSeenAt.toISOString(),
      masteredAt: row.masteredAt?.toISOString() ?? null,
      difficultyScore: row.difficultyScore,
      markedDifficult: row.markedDifficult,
      isDue: row.status !== 'NEW' && row.nextReviewAt <= now,
      isNew: row.status === 'NEW' && row.repetitions === 0,
    };
  }
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return NEW_WORDS_PER_DAY_DEFAULT;
  return Math.min(200, Math.max(1, Math.floor(limit)));
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function deriveStatus(input: {
  previousStatus: WordStatus;
  repetitions: number;
  intervalDays: number;
  correct: boolean;
  flagsDifficult: boolean;
}): WordStatus {
  if (input.flagsDifficult && !input.correct) return 'DIFFICULT';
  if (
    input.repetitions >= MASTERY_MIN_REPETITIONS &&
    input.intervalDays >= MASTERY_INTERVAL_DAYS &&
    input.correct
  ) {
    return 'MASTERED';
  }
  if (!input.correct) return 'LEARNING';
  if (input.previousStatus === 'MASTERED') return 'MASTERED';
  if (input.repetitions <= 1) return 'LEARNING';
  return 'REVIEW';
}
