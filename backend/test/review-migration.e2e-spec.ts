import { PrismaClient } from "@prisma/client";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

it("deploys FSRS over a populated legacy database without resetting history or enrolling the deck", async () => {
  const schema = "fsrs_migration_" + randomUUID().replace(/-/g, "");
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set("schema", schema);
  const scratch = await mkdtemp(join(tmpdir(), "lexodromia-migrate-"));
  const admin = new PrismaClient(),
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const migrationRoot = resolve(__dirname, "../prisma");
  const deploy = () =>
    promisify(execFile)(
      process.execPath,
      [
        require.resolve("prisma/build/index.js"),
        "migrate",
        "deploy",
        "--schema",
        join(scratch, "schema.prisma"),
      ],
      { env: { ...process.env, DATABASE_URL: url.toString() }, timeout: 60000 },
    );
  try {
    await mkdir(join(scratch, "migrations"));
    await cp(
      join(migrationRoot, "schema.prisma"),
      join(scratch, "schema.prisma"),
    );
    for (const file of [
      "migration_lock.toml",
      "20260902204000_init",
      "20260910180000_flashcards_srs",
    ])
      await cp(
        join(migrationRoot, "migrations", file),
        join(scratch, "migrations", file),
        { recursive: true },
      );
    await deploy();
    const user = await db.user.create({
      data: {
        email: "legacy@example.com",
        displayName: "Legacy",
        passwordHash: "unused",
      },
    });
    const pl = await db.language.create({
        data: { code: "pl", name: "Polski" },
      }),
      hr = await db.language.create({ data: { code: "hr", name: "Hrvatski" } });
    const course = await db.course.create({
      data: {
        slug: "pl-hr",
        name: "Polski → Chorwacki",
        sourceLanguageId: pl.id,
        targetLanguageId: hr.id,
      },
    });
    const due = new Date("2026-09-20T12:00:00Z");
    const legacy = await db.userWordProgress.create({
      data: {
        userId: user.id,
        courseId: course.id,
        wordRef: "pl-hr:1",
        correctAnswers: 12,
        wrongAnswers: 2,
        markedDifficult: true,
        nextReviewAt: due,
        status: "MASTERED",
      },
    });
    const session = await db.learningSession.create({
      data: { userId: user.id, courseId: course.id },
    });
    for (const wordRef of [
      "pl-hr:1",
      "sentence:gap:a1-01",
      "sentence:builder:a1-01",
      "pl-hr:verb:1:ja",
    ])
      await db.learningAnswer.create({
        data: {
          userId: user.id,
          sessionId: session.id,
          wordRef,
          answer: "legacy answer",
          correct: true,
        },
      });
    await cp(
      join(migrationRoot, "migrations", "20260911140000_unified_fsrs"),
      join(scratch, "migrations", "20260911140000_unified_fsrs"),
      { recursive: true },
    );
    await deploy();
    await deploy(); // migration deploy remains idempotent
    expect(
      await db.userWordProgress.findUnique({ where: { id: legacy.id } }),
    ).toEqual(legacy);
    expect(await db.learningAnswer.count()).toBe(4);
    expect(await db.reviewState.count()).toBe(3);
    expect(await db.reviewAttempt.count()).toBe(0); // no invented event history
    const word = await db.reviewState.findFirstOrThrow({
      where: { itemType: "WORD" },
    });
    expect(word).toMatchObject({
      itemId: "pl-hr:1",
      correctAnswers: 12,
      wrongAnswers: 2,
      markedDifficult: true,
      due,
      reps: 0,
      stability: 0,
      migrated: true,
    });
    expect(
      await db.reviewState.count({ where: { itemType: "SENTENCE" } }),
    ).toBe(1);
  } finally {
    await db.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
    await rm(scratch, { recursive: true, force: true });
  }
}, 120000);
