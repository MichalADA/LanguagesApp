-- AlterTable
ALTER TABLE "ListeningUnit"
  ADD COLUMN "unitNumber"   INTEGER,
  ADD COLUMN "moduleNumber" INTEGER;

-- AlterTable
ALTER TABLE "ListeningLesson"
  ADD COLUMN "lessonNumber"     INTEGER,
  ADD COLUMN "grammarUrl"       TEXT,
  ADD COLUMN "vocabularyUrl"    TEXT,
  ADD COLUMN "pronunciationUrl" TEXT;
