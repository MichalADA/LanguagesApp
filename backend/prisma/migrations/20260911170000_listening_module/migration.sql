-- CreateEnum
CREATE TYPE "ListeningSourceType" AS ENUM ('TAKO_LAKO', 'USER_UPLOAD', 'PODCAST', 'VIDEO', 'YOUTUBE');

-- CreateTable
CREATE TABLE "ListeningSource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceUrl" TEXT,
    "license" TEXT,
    "attribution" TEXT,
    "type" "ListeningSourceType" NOT NULL DEFAULT 'TAKO_LAKO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListeningSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningUnit" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListeningUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningLesson" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "transcript" TEXT,
    "audioUrl" TEXT,
    "videoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListeningLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListeningSource_slug_key" ON "ListeningSource"("slug");

-- CreateIndex
CREATE INDEX "ListeningSource_type_idx" ON "ListeningSource"("type");

-- CreateIndex
CREATE INDEX "ListeningUnit_sourceId_idx" ON "ListeningUnit"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ListeningUnit_sourceId_level_position_key" ON "ListeningUnit"("sourceId", "level", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ListeningLesson_sourceUrl_key" ON "ListeningLesson"("sourceUrl");

-- CreateIndex
CREATE INDEX "ListeningLesson_unitId_idx" ON "ListeningLesson"("unitId");

-- AddForeignKey
ALTER TABLE "ListeningUnit" ADD CONSTRAINT "ListeningUnit_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ListeningSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningLesson" ADD CONSTRAINT "ListeningLesson_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ListeningUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
