import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CompleteMissionDto, SLUG } from "./stories.dto";

/**
 * Progress of Lexodromia Stories. Mission content (dialogues, rewards) is frontend data;
 * the backend guarantees durability, one reward per mission and idempotent retries.
 */
@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private async courseId(key: string) {
    const course = await this.prisma.course.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
    });
    if (!course) throw new NotFoundException("Course not found");
    return course.id;
  }

  private slug(value: string, name: string) {
    if (!SLUG.test(value)) throw new BadRequestException(`Invalid ${name}`);
  }

  async progress(userId: string, courseKey: string, storyId: string) {
    this.slug(storyId, "storyId");
    const courseId = await this.courseId(courseKey);
    return this.snapshot(this.prisma, userId, courseId, storyId);
  }

  private async snapshot(
    db: Prisma.TransactionClient,
    userId: string,
    courseId: string,
    storyId: string,
  ) {
    const [state, missions] = await Promise.all([
      db.storyProgress.findUnique({
        where: { userId_courseId_storyId: { userId, courseId, storyId } },
      }),
      db.storyMissionCompletion.findMany({
        where: { userId, courseId, storyId },
        orderBy: { firstCompletedAt: "asc" },
      }),
    ]);
    return {
      storyId,
      flags: state?.flags ?? [],
      xp: state?.xp ?? 0,
      missions: missions.map((m) => ({
        missionId: m.missionId,
        firstCompletedAt: m.firstCompletedAt.toISOString(),
        lastCompletedAt: m.lastCompletedAt.toISOString(),
        plays: m.plays,
        bestScore: m.bestScore,
        xp: m.xp,
      })),
    };
  }

  /**
   * Records a finished mission. The first completion creates the row and grants the reward;
   * replays only update plays / best score. The same eventId twice (network retry) is a no-op.
   */
  async complete(
    userId: string,
    storyId: string,
    missionId: string,
    dto: CompleteMissionDto,
  ) {
    this.slug(storyId, "storyId");
    this.slug(missionId, "missionId");
    const courseId = await this.courseId(dto.course);
    return this.prisma.$transaction(async (tx) => {
      // Serializes completions of one user (two tabs, retries) — same pattern as reviews.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`stories:${userId}`}, 0))`;
      const key = { userId, courseId, storyId, missionId };
      const existing = await tx.storyMissionCompletion.findUnique({
        where: { userId_courseId_storyId_missionId: key },
      });
      let xpAwarded = 0;
      let duplicate = false;
      if (!existing) {
        xpAwarded = dto.xp;
        await tx.storyMissionCompletion.create({
          data: {
            ...key,
            bestScore: dto.score,
            xp: dto.xp,
            lastEventId: dto.eventId,
          },
        });
      } else if (existing.lastEventId === dto.eventId) {
        duplicate = true;
      } else {
        await tx.storyMissionCompletion.update({
          where: { id: existing.id },
          data: {
            plays: { increment: 1 },
            bestScore: Math.max(existing.bestScore, dto.score),
            lastCompletedAt: new Date(),
            lastEventId: dto.eventId,
          },
        });
      }
      const state = await tx.storyProgress.findUnique({
        where: { userId_courseId_storyId: { userId, courseId, storyId } },
      });
      const flags = [
        ...new Set([...(state?.flags ?? []), ...dto.flags]),
      ].sort();
      await tx.storyProgress.upsert({
        where: { userId_courseId_storyId: { userId, courseId, storyId } },
        create: { userId, courseId, storyId, flags, xp: xpAwarded },
        update: { flags, xp: { increment: xpAwarded } },
      });
      return {
        firstCompletion: !existing,
        duplicate,
        xpAwarded,
        progress: await this.snapshot(tx, userId, courseId, storyId),
      };
    });
  }
}
