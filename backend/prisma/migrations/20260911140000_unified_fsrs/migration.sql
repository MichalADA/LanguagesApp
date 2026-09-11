BEGIN;

-- CreateEnum
CREATE TYPE "ReviewItemType" AS ENUM ('WORD', 'SENTENCE', 'VERB', 'GRAMMAR', 'PHRASE');

-- CreateTable
CREATE TABLE "ReviewState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "itemType" "ReviewItemType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 0,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "due" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReview" TIMESTAMP(3),
    "scheduledDays" INTEGER NOT NULL DEFAULT 0,
    "elapsedDays" INTEGER NOT NULL DEFAULT 0,
    "learningSteps" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "markedDifficult" BOOLEAN NOT NULL DEFAULT false,
    "migrated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAttempt" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "reviewStateId" TEXT NOT NULL,
    "itemType" "ReviewItemType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameType" TEXT NOT NULL,
    "direction" TEXT,
    "correct" BOOLEAN NOT NULL,
    "rating" INTEGER NOT NULL,
    "responseTimeMs" INTEGER,
    "usedHint" BOOLEAN NOT NULL DEFAULT false,
    "attemptsBeforeCorrect" INTEGER NOT NULL DEFAULT 0,
    "answer" TEXT NOT NULL,
    "previousDue" TIMESTAMP(3) NOT NULL,
    "nextDue" TIMESTAMP(3) NOT NULL,
    "previousStability" DOUBLE PRECISION NOT NULL,
    "newStability" DOUBLE PRECISION NOT NULL,
    "previousDifficulty" DOUBLE PRECISION NOT NULL,
    "newDifficulty" DOUBLE PRECISION NOT NULL,
    "schedulerVersion" TEXT NOT NULL,

    CONSTRAINT "ReviewAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewState_userId_due_idx" ON "ReviewState"("userId", "due");

-- CreateIndex
CREATE INDEX "ReviewState_userId_courseId_itemType_due_idx" ON "ReviewState"("userId", "courseId", "itemType", "due");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewState_userId_itemType_itemId_key" ON "ReviewState"("userId", "itemType", "itemId");

-- CreateIndex
CREATE INDEX "ReviewAttempt_userId_timestamp_idx" ON "ReviewAttempt"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "ReviewAttempt_userId_courseId_timestamp_idx" ON "ReviewAttempt"("userId", "courseId", "timestamp");

-- CreateIndex
CREATE INDEX "ReviewAttempt_userId_itemType_itemId_timestamp_idx" ON "ReviewAttempt"("userId", "itemType", "itemId", "timestamp");

-- CreateIndex
CREATE INDEX "ReviewAttempt_reviewStateId_idx" ON "ReviewAttempt"("reviewStateId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAttempt_userId_eventId_key" ON "ReviewAttempt"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "ReviewState" ADD CONSTRAINT "ReviewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewState" ADD CONSTRAINT "ReviewState_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAttempt" ADD CONSTRAINT "ReviewAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAttempt" ADD CONSTRAINT "ReviewAttempt_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAttempt" ADD CONSTRAINT "ReviewAttempt_reviewStateId_fkey" FOREIGN KEY ("reviewStateId") REFERENCES "ReviewState"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Preserve the legacy tables as an audit snapshot. There is no complete review
-- log to reconstruct FSRS stability from: initialize conservatively, retain due,
-- first seen, flags and lifetime answer counts; never invent review events.
INSERT INTO "ReviewState" ("id","userId","courseId","itemType","itemId","due","correctAnswers","wrongAnswers","markedDifficult","migrated","createdAt","updatedAt")
SELECT 'legacy-' || p."id", p."userId", p."courseId", 'WORD'::"ReviewItemType",
CASE WHEN p."wordRef" LIKE c."slug" || ':%' THEN p."wordRef" ELSE c."slug" || ':' || p."wordRef" END,
p."nextReviewAt", p."correctAnswers", p."wrongAnswers", p."markedDifficult", true, p."firstSeenAt", CURRENT_TIMESTAMP
FROM "UserWordProgress" p JOIN "Course" c ON c.id=p."courseId"
ON CONFLICT ("userId","itemType","itemId") DO NOTHING;

CREATE INDEX "ReviewState_userId_courseId_id_idx" ON "ReviewState"("userId", "courseId", "id");

-- Enrol material from actual old game attempts, never from the entire dataset.
INSERT INTO "ReviewState" ("id","userId","courseId","itemType","itemId","due","migrated","createdAt","updatedAt")
SELECT 'game-' || md5(a."userId" || ':' || s."courseId" || ':' || a."wordRef"), a."userId", s."courseId",
 CASE WHEN a."wordRef" LIKE 'sentence:%' THEN 'SENTENCE'::"ReviewItemType" WHEN a."wordRef" LIKE '%:verb:%' THEN 'VERB'::"ReviewItemType" ELSE 'WORD'::"ReviewItemType" END,
 CASE WHEN a."wordRef" LIKE 'sentence:%' THEN c."slug" || ':sentence:' || regexp_replace(a."wordRef", '^sentence:[^:]+:', '') WHEN a."wordRef" LIKE c."slug" || ':%' THEN a."wordRef" ELSE c."slug" || ':' || a."wordRef" END,
 CURRENT_TIMESTAMP, true, min(a."createdAt"), CURRENT_TIMESTAMP
FROM "LearningAnswer" a JOIN "LearningSession" s ON s.id=a."sessionId" JOIN "Course" c ON c.id=s."courseId"
GROUP BY a."userId", s."courseId", a."wordRef", c."slug"
ON CONFLICT ("userId","itemType","itemId") DO NOTHING;

COMMIT;
