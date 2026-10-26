import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { dayKey, goalStreak, previousDay } from "../src/xp/xp.policy";

/** Account XP: once-per-source rewards, retries, caps, daily goal and goal streak (Postgres). */
describe("Account XP (Postgres e2e)", () => {
  let app: INestApplication;
  let db: PrismaService;
  let alice: string, bob: string, token: string, bobToken: string;
  const award = (body: Record<string, unknown>, auth = token) =>
    request(app.getHttpServer())
      .post("/me/xp/events")
      .set("Authorization", `Bearer ${auth}`)
      .send({ course: "pl-hr", eventId: randomUUID(), ...body });
  const summary = (auth = token) =>
    request(app.getHttpServer())
      .get("/me/xp")
      .set("Authorization", `Bearer ${auth}`);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
    const users = await Promise.all(
      ["alice", "bob"].map((name) =>
        db.user.create({
          data: {
            email: `xp-${name}-${randomUUID()}@example.com`,
            passwordHash: "unused",
            displayName: name,
          },
        }),
      ),
    );
    [alice, bob] = users.map((u) => u.id);
    [token, bobToken] = users.map((u) =>
      app
        .get(JwtService)
        .sign(
          { sub: u.id, email: u.email },
          { secret: process.env.JWT_SECRET },
        ),
    );
  });
  afterAll(async () => {
    if (db) await db.user.deleteMany({ where: { id: { in: [alice, bob] } } });
    if (app) await app.close();
  });

  it("starts at zero with the default daily goal", async () => {
    const body = (await summary().expect(200)).body;
    expect(body).toMatchObject({
      total: 0,
      today: 0,
      goal: 20,
      goalMet: false,
      goalStreak: 0,
    });
    expect(body.last7).toHaveLength(7);
    expect(body.last7[6]).toEqual({ day: dayKey(), xp: 0 });
  });

  it("awards a lesson and a story mission once, reviews every session; retries never double", async () => {
    const lesson = {
      source: "lesson",
      sourceId: "a1-01-01",
      xp: 20,
      eventId: randomUUID(),
    };
    expect((await award(lesson).expect(201)).body).toMatchObject({
      awarded: 20,
      duplicate: false,
    });
    // Retry of the same request (network) and a replay of the lesson (new event id).
    expect((await award(lesson).expect(201)).body).toMatchObject({
      awarded: 0,
      duplicate: true,
    });
    expect(
      (await award({ ...lesson, eventId: randomUUID() }).expect(201)).body
        .awarded,
    ).toBe(0);
    await award({
      source: "story",
      sourceId: "split-a1:m3-coffee",
      xp: 40,
    }).expect(201);
    await award({ source: "review", sourceId: "session-1", xp: 8 }).expect(201);
    const second = await award({
      source: "review",
      sourceId: "session-2",
      xp: 999,
    }).expect(400);
    expect(second.body.message).toBeDefined();
    const capped = await award({
      source: "review",
      sourceId: "session-2",
      xp: 300,
    }).expect(201);
    expect(capped.body.awarded).toBe(50);
    const body = capped.body.summary;
    expect(body).toMatchObject({
      total: 118,
      today: 118,
      goalMet: true,
      goalStreak: 1,
    });
    // Concurrent duplicates of one event count once.
    const same = {
      source: "review",
      sourceId: "session-3",
      xp: 5,
      eventId: randomUUID(),
    };
    const results = await Promise.all(
      Array.from({ length: 4 }, () => award(same).expect(201)),
    );
    expect(results.filter((r) => r.body.awarded === 5)).toHaveLength(1);
  });

  it("changes the daily goal only to allowed levels and isolates users", async () => {
    const http = request(app.getHttpServer());
    expect(
      (
        await http
          .put("/me/xp/goal")
          .set("Authorization", `Bearer ${token}`)
          .send({ goal: 50 })
          .expect(200)
      ).body.goal,
    ).toBe(50);
    await http
      .put("/me/xp/goal")
      .set("Authorization", `Bearer ${token}`)
      .send({ goal: 7 })
      .expect(400);
    expect((await summary(bobToken).expect(200)).body).toMatchObject({
      total: 0,
      goal: 20,
    });
    await award({ source: "lesson", sourceId: "x", xp: 10, extra: 1 }).expect(
      400,
    );
    await award({ source: "coins", sourceId: "x", xp: 10 }).expect(400);
    await award({
      source: "lesson",
      sourceId: "x",
      xp: 10,
      course: "nope",
    }).expect(404);
    await request(app.getHttpServer()).get("/me/xp").expect(401);
  });

  it("counts the goal streak over consecutive days", () => {
    const today = "2026-10-11";
    const days = new Map([
      [today, 25],
      [previousDay(today), 30],
      ["2026-10-09", 20],
      ["2026-10-07", 90],
    ]);
    expect(goalStreak(days, 20, today)).toBe(3);
    expect(goalStreak(new Map([["2026-10-10", 30]]), 20, today)).toBe(1); // today not done yet
    expect(goalStreak(days, 50, today)).toBe(0);
  });
});
