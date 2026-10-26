import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

/** Lexodromia Stories progress on real Postgres: durability, one reward, retries, isolation. */
describe("Stories progress (Postgres e2e)", () => {
  let app: INestApplication;
  let db: PrismaService;
  let alice: string, bob: string, token: string, bobToken: string;
  const done = (overrides: Record<string, unknown> = {}) => ({
    course: "pl-hr",
    eventId: randomUUID(),
    score: 80,
    xp: 30,
    flags: ["met-marko"],
    ...overrides,
  });
  const post = (path: string, body: object, auth = token) =>
    request(app.getHttpServer())
      .post(path)
      .set("Authorization", `Bearer ${auth}`)
      .send(body);
  const get = (path: string, auth = token) =>
    request(app.getHttpServer())
      .get(path)
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
            email: `stories-${name}-${randomUUID()}@example.com`,
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

  it("starts empty, grants the reward once, keeps the best score and merges flags", async () => {
    const empty = await get("/stories/split-a1/progress?course=pl-hr").expect(
      200,
    );
    expect(empty.body).toEqual({
      storyId: "split-a1",
      flags: [],
      xp: 0,
      missions: [],
    });

    const first = await post(
      "/stories/split-a1/missions/m1-welcome/complete",
      done({ score: 60 }),
    ).expect(201);
    expect(first.body).toMatchObject({ firstCompletion: true, xpAwarded: 30 });
    expect(first.body.progress.xp).toBe(30);

    // Replay: no new reward, better score is kept, plays counted.
    const replay = await post(
      "/stories/split-a1/missions/m1-welcome/complete",
      done({ score: 100, xp: 30, flags: ["has-key"] }),
    ).expect(201);
    expect(replay.body).toMatchObject({ firstCompletion: false, xpAwarded: 0 });
    expect(replay.body.progress.xp).toBe(30);
    expect(replay.body.progress.flags).toEqual(["has-key", "met-marko"]);
    expect(replay.body.progress.missions[0]).toMatchObject({
      missionId: "m1-welcome",
      plays: 2,
      bestScore: 100,
    });
    const worse = await post(
      "/stories/split-a1/missions/m1-welcome/complete",
      done({ score: 10 }),
    ).expect(201);
    expect(worse.body.progress.missions[0].bestScore).toBe(100);

    // Durable: a fresh read returns the same state.
    const read = await get("/stories/split-a1/progress?course=pl-hr").expect(
      200,
    );
    expect(read.body.xp).toBe(30);
    expect(read.body.missions).toHaveLength(1);
  });

  it("treats a retried request (same eventId) as a no-op, also when sent concurrently", async () => {
    const body = done({ xp: 25 });
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        post("/stories/split-a1/missions/m3-coffee/complete", body).expect(201),
      ),
    );
    expect(results.filter((r) => r.body.firstCompletion)).toHaveLength(1);
    const row = await db.storyMissionCompletion.findFirstOrThrow({
      where: { userId: alice, missionId: "m3-coffee" },
    });
    expect(row.plays).toBe(1);
    const state = await db.storyProgress.findFirstOrThrow({
      where: { userId: alice },
    });
    expect(state.xp).toBe(55);
  });

  it("isolates users and validates input and auth", async () => {
    expect(
      (
        await get("/stories/split-a1/progress?course=pl-hr", bobToken).expect(
          200,
        )
      ).body.xp,
    ).toBe(0);
    await request(app.getHttpServer())
      .get("/stories/split-a1/progress?course=pl-hr")
      .expect(401);
    await get("/stories/split-a1/progress").expect(400);
    await get("/stories/Bad Id!/progress?course=pl-hr").expect(400);
    await get("/stories/split-a1/progress?course=nope").expect(404);
    await post(
      "/stories/split-a1/missions/m1/complete",
      done({ xp: 9999 }),
    ).expect(400);
    await post(
      "/stories/split-a1/missions/m1/complete",
      done({ flags: ["DROP TABLE"] }),
    ).expect(400);
    await post("/stories/split-a1/missions/m1/complete", {
      ...done(),
      extra: 1,
    }).expect(400);
  });
});
