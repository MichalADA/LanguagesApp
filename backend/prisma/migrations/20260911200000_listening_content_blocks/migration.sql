-- CreateEnum
CREATE TYPE "ListeningContentStatus" AS ENUM ('NOT_IMPORTED', 'IMPORTED', 'PARTIAL', 'FAILED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ListeningContentBlockType" AS ENUM ('HEADING', 'PARAGRAPH', 'IMAGE', 'AUDIO', 'VIDEO', 'TRANSCRIPT', 'EXERCISE', 'NOTE');

-- AlterTable
ALTER TABLE "ListeningLesson"
  ADD COLUMN "contentStatus"     "ListeningContentStatus" NOT NULL DEFAULT 'NOT_IMPORTED',
  ADD COLUMN "contentImportedAt" TIMESTAMP(3),
  ADD COLUMN "contentNote"       TEXT;

-- CreateIndex
CREATE INDEX "ListeningLesson_contentStatus_idx" ON "ListeningLesson"("contentStatus");

-- CreateTable
CREATE TABLE "ListeningContentBlock" (
    "id"           TEXT NOT NULL,
    "lessonId"     TEXT NOT NULL,
    "type"         "ListeningContentBlockType" NOT NULL,
    "position"     INTEGER NOT NULL,
    "text"         TEXT,
    "url"          TEXT,
    "metadataJson" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListeningContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListeningContentBlock_lessonId_position_idx" ON "ListeningContentBlock"("lessonId", "position");

-- AddForeignKey
ALTER TABLE "ListeningContentBlock" ADD CONSTRAINT "ListeningContentBlock_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ListeningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
