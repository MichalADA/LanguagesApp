-- CreateEnum
CREATE TYPE "WordStatus" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'MASTERED', 'DIFFICULT');

-- CreateEnum
CREATE TYPE "FlashcardMode" AS ENUM ('NEW', 'REVIEW', 'MIXED', 'DIFFICULT');

-- CreateEnum
CREATE TYPE "FlashcardDirection" AS ENUM ('SOURCE_TO_TARGET', 'TARGET_TO_SOURCE', 'MIXED');

-- CreateTable
CREATE TABLE "UserWordProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "wordRef" TEXT NOT NULL,
    "status" "WordStatus" NOT NULL DEFAULT 'NEW',
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "masteredAt" TIMESTAMP(3),
    "difficultyScore" INTEGER NOT NULL DEFAULT 0,
    "markedDifficult" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserWordProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "mode" "FlashcardMode" NOT NULL,
    "direction" "FlashcardDirection" NOT NULL DEFAULT 'MIXED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "newWords" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FlashcardSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWordProgress_userId_courseId_wordRef_key" ON "UserWordProgress"("userId", "courseId", "wordRef");

-- CreateIndex
CREATE INDEX "UserWordProgress_userId_courseId_nextReviewAt_idx" ON "UserWordProgress"("userId", "courseId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "UserWordProgress_userId_courseId_status_idx" ON "UserWordProgress"("userId", "courseId", "status");

-- CreateIndex
CREATE INDEX "FlashcardSession_userId_idx" ON "FlashcardSession"("userId");

-- CreateIndex
CREATE INDEX "FlashcardSession_userId_courseId_idx" ON "FlashcardSession"("userId", "courseId");

-- AddForeignKey
ALTER TABLE "UserWordProgress" ADD CONSTRAINT "UserWordProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordProgress" ADD CONSTRAINT "UserWordProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardSession" ADD CONSTRAINT "FlashcardSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardSession" ADD CONSTRAINT "FlashcardSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
