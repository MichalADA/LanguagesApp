-- AlterTable
ALTER TABLE "ListeningContentBlock"
  ADD COLUMN "sourceText"     TEXT,
  ADD COLUMN "translatedText" TEXT,
  ADD COLUMN "speaker"        TEXT;
