import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AwardXpDto } from "./xp.dto";
import {
  dayKey,
  DEFAULT_GOAL,
  goalStreak,
  previousDay,
  XP_SOURCES,
} from "./xp.policy";

@Injectable()
export class XpService {
  constructor(private readonly prisma: PrismaService) {}

  /** Account XP: total, today vs. daily goal, goal streak and the last 7 days. */
  async summary(userId: string, db: Prisma.TransactionClient = this.prisma) {
    const today = dayKey();
    const [settings, total, days] = await Promise.all([
      db.xpSettings.findUnique({ where: { userId } }),
      db.xpEvent.aggregate({ where: { userId }, _sum: { xp: true } }),
      db.xpEvent.groupBy({
        by: ["day"],
        where: { userId },
        _sum: { xp: true },
      }),
    ]);
    const goal = settings?.dailyGoal ?? DEFAULT_GOAL;
    const perDay = new Map(days.map((d) => [d.day, d._sum.xp ?? 0]));
    const last7: { day: string; xp: number }[] = [];
    for (let i = 0, day = today; i < 7; i++, day = previousDay(day))
      last7.unshift({ day, xp: perDay.get(day) ?? 0 });
    const todayXp = perDay.get(today) ?? 0;
    return {
      total: total._sum.xp ?? 0,
      today: todayXp,
      goal,
      goalMet: todayXp >= goal,
      goalStreak: goalStreak(perDay, goal, today),
      last7,
    };
  }

  /**
   * Records an award. Same eventId twice → no-op; a "once" source (lesson, story) that was
   * already rewarded → 0 XP. The amount is capped per source.
   */
  async award(userId: string, dto: AwardXpDto) {
    const course = await this.prisma.course.findFirst({
      where: { OR: [{ id: dto.course }, { slug: dto.course }] },
    });
    if (!course) throw new NotFoundException("Course not found");
    const rule = XP_SOURCES[dto.source];
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`xp:${userId}`}, 0))`;
      const duplicate = await tx.xpEvent.findUnique({
        where: { userId_eventId: { userId, eventId: dto.eventId } },
      });
      let awarded = 0;
      if (!duplicate) {
        const already = rule.once
          ? await tx.xpEvent.findFirst({
              where: {
                userId,
                courseId: course.id,
                source: dto.source,
                sourceId: dto.sourceId,
              },
            })
          : null;
        if (!already) {
          awarded = Math.min(dto.xp, rule.max);
          await tx.xpEvent.create({
            data: {
              userId,
              courseId: course.id,
              eventId: dto.eventId,
              source: dto.source,
              sourceId: dto.sourceId,
              xp: awarded,
              day: dayKey(),
            },
          });
        }
      }
      return {
        awarded,
        duplicate: Boolean(duplicate),
        summary: await this.summary(userId, tx),
      };
    });
  }

  async setGoal(userId: string, goal: number) {
    await this.prisma.xpSettings.upsert({
      where: { userId },
      create: { userId, dailyGoal: goal },
      update: { dailyGoal: goal },
    });
    return this.summary(userId);
  }
}
