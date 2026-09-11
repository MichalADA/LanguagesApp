import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ReviewsService } from "../src/reviews/reviews.service";
import { LearningService } from "../src/learning/learning.service";
import { FlashcardsService } from "../src/flashcards/flashcards.service";
import { ReviewAnswerDto } from "../src/reviews/review.dto";

/** Uses real Postgres transactions, indexes and advisory locks (CI postgres service). */
describe("Unified reviews (Postgres e2e)", () => {
  let app: INestApplication,
    db: PrismaService,
    reviews: ReviewsService,
    learning: LearningService,
    flashcards: FlashcardsService;
  let alice: string,
    bob: string,
    token: string,
    bobToken: string,
    courseId: string;
  const body = (overrides: Partial<ReviewAnswerDto> = {}): ReviewAnswerDto => ({
    eventId: randomUUID(),
    course: "pl-hr",
    itemType: "WORD",
    itemId: "pl-hr:1",
    gameType: "bura",
    direction: "SOURCE_TO_TARGET",
    answer: "kuća",
    correct: true,
    ...overrides,
  });
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
    reviews = app.get(ReviewsService);
    learning = app.get(LearningService);
    flashcards = app.get(FlashcardsService);
    courseId = (await db.course.findUniqueOrThrow({ where: { slug: "pl-hr" } }))
      .id;
    const users = await Promise.all(
      ["alice", "bob"].map((name) =>
        db.user.create({
          data: {
            email: `fsrs-${name}-${randomUUID()}@example.com`,
            passwordHash: "unused-test-only",
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
  beforeEach(async () => {
    await db.reviewState.deleteMany({
      where: { userId: { in: [alice, bob] } },
    });
  });
  afterAll(async () => {
    if (db) await db.user.deleteMany({ where: { id: { in: [alice, bob] } } });
    if (app) await app.close();
  });

  it("shares a single word schedule across Bura, Trasa, flashcards and both directions", async () => {
    const session = await learning.startSession(alice, "pl-hr");
    await learning.recordAnswer(alice, session.id, {
      wordRef: "pl-hr:1",
      answer: "kuća",
      correct: true,
      eventId: randomUUID(),
      gameType: "bura",
      direction: "SOURCE_TO_TARGET",
    });
    await learning.recordAnswer(alice, session.id, {
      wordRef: "pl-hr:1",
      answer: "dom",
      correct: true,
      eventId: randomUUID(),
      gameType: "trasa",
      direction: "TARGET_TO_SOURCE",
    });
    await flashcards.submitAnswer(alice, {
      course: "pl-hr",
      wordRef: "pl-hr:1",
      answer: "wrong",
      correct: false,
      rating: "EASY",
      direction: "SOURCE_TO_TARGET",
      eventId: randomUUID(),
    });
    const states = await db.reviewState.findMany({ where: { userId: alice } });
    expect(states).toHaveLength(1);
    expect(states[0].reps).toBe(3);
    const events = await db.reviewAttempt.findMany({
      where: { userId: alice },
      orderBy: { timestamp: "asc" },
    });
    expect(events.map((e) => e.gameType)).toEqual([
      "bura",
      "trasa",
      "flashcards",
    ]);
    expect(events[1].direction).toBe("TARGET_TO_SOURCE");
    expect(events[2].rating).toBe(1);
    expect(events[2].previousStability).toBe(events[1].newStability);
  });
  it("shares sentence modes without enrolling every word in a sentence", async () => {
    const session = await learning.startSession(alice, "pl-hr");
    for (const mode of [
      "translation",
      "gap",
      "builder",
      "correction",
      "transform",
    ])
      await learning.recordAnswer(alice, session.id, {
        wordRef: `sentence:${mode}:a1-01`,
        answer: "Ja sam kod kuće.",
        correct: true,
        eventId: randomUUID(),
        gameType: `sentence-${mode}`,
      });
    expect(
      await db.reviewState.count({
        where: { userId: alice, itemType: "WORD" },
      }),
    ).toBe(0);
    const state = await db.reviewState.findFirstOrThrow({
      where: { userId: alice },
    });
    expect(state.itemType).toBe("SENTENCE");
    expect(state.itemId).toBe("pl-hr:sentence:a1-01");
    expect(state.reps).toBe(5);
  });
  it("serializes concurrent unique events and suppresses simultaneous duplicate requests", async () => {
    const same = body();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => reviews.answer(alice, same)),
    );
    expect(results.filter((r) => !r.duplicate)).toHaveLength(1);
    await Promise.all(
      Array.from({ length: 8 }, () => reviews.answer(alice, body())),
    );
    const state = await db.reviewState.findFirstOrThrow({
      where: { userId: alice },
    });
    expect(state.reps).toBe(9);
    expect(state.correctAnswers).toBe(9);
    expect(await db.reviewAttempt.count({ where: { userId: alice } })).toBe(9);
    await expect(
      reviews.answer(alice, { ...same, usedHint: true }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("rolls back both history and state when a later transaction operation fails", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await reviews.record(tx, alice, courseId, body());
        throw new Error("simulated session persistence failure");
      }),
    ).rejects.toThrow("simulated session persistence failure");
    expect(await db.reviewState.count({ where: { userId: alice } })).toBe(0);
    expect(await db.reviewAttempt.count({ where: { userId: alice } })).toBe(0);
  });
  it("validates input, JWT, ownership and course namespaces", async () => {
    const server = app.getHttpServer();
    await request(server).get("/reviews/due").expect(401);
    await request(server)
      .post("/reviews/answer")
      .set("Authorization", `Bearer ${token}`)
      .send(body({ itemId: "pl-en:1" }))
      .expect(400);
    await request(server)
      .post("/reviews/answer")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...body(), rating: 4 })
      .expect(400);
    await request(server)
      .get("/reviews/due?limit=1000")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
    const otherSession = await learning.startSession(bob, "pl-hr");
    await request(server)
      .post("/reviews/answer")
      .set("Authorization", `Bearer ${token}`)
      .send(body({ sessionId: otherSession.id }))
      .expect(403);
    expect(await db.reviewAttempt.count({ where: { userId: alice } })).toBe(0);
  });
  it("filters and limits due items in the database; isolates stats and progress", async () => {
    const past = new Date(Date.now() - 86400000),
      future = new Date(Date.now() + 86400000);
    await db.reviewState.createMany({
      data: [
        {
          userId: alice,
          courseId,
          itemType: "WORD",
          itemId: "pl-hr:due-word",
          due: past,
        },
        {
          userId: alice,
          courseId,
          itemType: "SENTENCE",
          itemId: "pl-hr:sentence:due",
          due: past,
        },
        {
          userId: alice,
          courseId,
          itemType: "VERB",
          itemId: "pl-hr:verb:1:ja",
          due: future,
        },
        {
          userId: bob,
          courseId,
          itemType: "WORD",
          itemId: "pl-hr:bob",
          due: past,
        },
      ],
    });
    const get = (path: string, auth = token) =>
      request(app.getHttpServer())
        .get(path)
        .set("Authorization", `Bearer ${auth}`)
        .expect(200);
    const all = await get("/reviews/due?course=pl-hr&language=hr");
    expect(all.body).toHaveLength(2);
    expect(
      (await get("/reviews/due?course=pl-hr&itemType=WORD&limit=1")).body[0]
        .itemId,
    ).toBe("pl-hr:due-word");
    expect((await get("/reviews/due?language=en")).body).toEqual([]);
    expect((await get("/reviews/stats?course=pl-hr")).body).toMatchObject({
      seen: 3,
      due: 2,
      accuracy7: null,
    });
    expect(
      (await get("/reviews/stats?course=pl-hr", bobToken)).body,
    ).toMatchObject({ seen: 1, due: 1 });
    const progress = (await get("/reviews/progress?course=pl-hr", bobToken))
      .body;
    expect(progress.items).toHaveLength(1);
    expect(progress.items[0].wordRef).toBe("pl-hr:bob");
  });
  it("counts mixed session attempts once, including retries after finishing", async () => {
    const session = await learning.startSession(alice, "pl-hr");
    const answer = body({ sessionId: session.id, correct: false });
    await reviews.answer(alice, answer);
    await reviews.answer(alice, answer);
    await reviews.answer(
      alice,
      body({ sessionId: session.id, attemptsBeforeCorrect: 1 }),
    );
    const finished = await learning.finishSession(alice, session.id);
    expect(finished).toMatchObject({
      totalAnswers: 2,
      correctAnswers: 1,
      wrongAnswers: 1,
    });
    expect((await reviews.answer(alice, answer)).duplicate).toBe(true);
    await expect(
      reviews.answer(alice, body({ sessionId: session.id })),
    ).rejects.toMatchObject({ status: 409 });
    expect((await reviews.stats(alice, "pl-hr")).accuracy7).toBe(50);
  });
});
