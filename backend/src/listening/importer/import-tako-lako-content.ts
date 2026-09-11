/* eslint-disable no-console */
/**
 * Tako Lako CONTENT importer.
 *
 * Walks `ListeningLesson` rows already in the DB (populated by the catalog
 * importer or the seed) and fetches each lesson's `sourceUrl` to extract its
 * semantic content into `ListeningContentBlock` rows.
 *
 * Idempotent per lesson: on a successful fetch+parse we replace this lesson's
 * blocks in one transaction and stamp `contentStatus`/`contentImportedAt`.
 * A failed fetch flags the lesson without touching existing blocks.
 *
 * Failure buckets:
 *   IMPORTED     — fetched, parsed, at least one block written
 *   PARTIAL      — fetched and parsed but a suspiciously thin result (no
 *                  paragraphs and no transcript)
 *   UNAVAILABLE  — HTTP 403 / 404 / 451 (source refuses; upstream policy)
 *   FAILED       — network error or other HTTP failure
 *
 * Explicitly does NOT bypass CloudFront or run headless browsers.
 * Ran via `npm run import:tako-lako:content`, never at server startup.
 */
import { PrismaClient, ListeningContentStatus, ListeningContentBlockType } from '@prisma/client';
import { parseLessonContent, type ParsedContentBlock, type ParsedBlockType } from './lesson-content-parser';

interface Options {
  /** Import at most this many lessons in one run. */
  limit?: number;
  /** When true, re-imports lessons already marked IMPORTED. Default: no. */
  force?: boolean;
}

interface FetchOutcome {
  status: 'ok' | 'unavailable' | 'failed';
  html?: string;
  note?: string;
}

interface Stats {
  considered: number;
  imported: number;
  partial: number;
  unavailable: number;
  failed: number;
  skipped: number;
  blocks: number;
}

const emptyStats = (): Stats => ({
  considered: 0, imported: 0, partial: 0, unavailable: 0, failed: 0, skipped: 0, blocks: 0,
});

async function fetchLessonHtml(url: string): Promise<FetchOutcome> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LexodromiaBot/0.1 (+https://lexodromia.local)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (response.ok) return { status: 'ok', html: await response.text() };
    if ([403, 404, 451].includes(response.status)) {
      return { status: 'unavailable', note: `HTTP ${response.status} from source` };
    }
    return { status: 'failed', note: `HTTP ${response.status} from source` };
  } catch (error) {
    return { status: 'failed', note: (error as Error).message };
  }
}

const BLOCK_TYPES: Record<ParsedBlockType, ListeningContentBlockType> = {
  HEADING: ListeningContentBlockType.HEADING,
  PARAGRAPH: ListeningContentBlockType.PARAGRAPH,
  IMAGE: ListeningContentBlockType.IMAGE,
  AUDIO: ListeningContentBlockType.AUDIO,
  VIDEO: ListeningContentBlockType.VIDEO,
  TRANSCRIPT: ListeningContentBlockType.TRANSCRIPT,
  EXERCISE: ListeningContentBlockType.EXERCISE,
  NOTE: ListeningContentBlockType.NOTE,
};

/** A parse counts as PARTIAL when it produced no paragraph and no transcript. */
function classifyOutcome(blocks: ParsedContentBlock[]): 'IMPORTED' | 'PARTIAL' {
  const hasPara = blocks.some((b) => b.type === 'PARAGRAPH');
  const hasTranscript = blocks.some((b) => b.type === 'TRANSCRIPT');
  return hasPara || hasTranscript ? 'IMPORTED' : 'PARTIAL';
}

async function saveBlocks(
  prisma: PrismaClient,
  lessonId: string,
  blocks: ParsedContentBlock[],
  outcome: 'IMPORTED' | 'PARTIAL',
) {
  await prisma.$transaction(async (tx) => {
    await tx.listeningContentBlock.deleteMany({ where: { lessonId } });
    if (blocks.length > 0) {
      await tx.listeningContentBlock.createMany({
        data: blocks.map((block, index) => ({
          lessonId,
          type: BLOCK_TYPES[block.type],
          position: index + 1,
          text: block.text,
          url: block.url,
          metadataJson: block.metadata ? JSON.stringify(block.metadata) : null,
        })),
      });
    }
    await tx.listeningLesson.update({
      where: { id: lessonId },
      data: {
        contentStatus:
          outcome === 'IMPORTED'
            ? ListeningContentStatus.IMPORTED
            : ListeningContentStatus.PARTIAL,
        contentImportedAt: new Date(),
        contentNote: null,
      },
    });
  });
}

async function markLessonStatus(
  prisma: PrismaClient,
  lessonId: string,
  status: ListeningContentStatus,
  note: string | null,
) {
  await prisma.listeningLesson.update({
    where: { id: lessonId },
    data: { contentStatus: status, contentNote: note },
  });
}

export async function importTakoLakoContent(
  prisma: PrismaClient,
  options: Options = {},
): Promise<Stats> {
  const stats = emptyStats();
  const source = await prisma.listeningSource.findUnique({ where: { slug: 'tako-lako' } });
  if (!source) {
    console.warn('[tako-lako:content] source "tako-lako" not found; run npm run import:tako-lako first.');
    return stats;
  }

  const lessons = await prisma.listeningLesson.findMany({
    where: {
      unit: { sourceId: source.id },
      sourceUrl: { not: null },
      ...(options.force ? {} : { contentStatus: { in: [
        ListeningContentStatus.NOT_IMPORTED,
        ListeningContentStatus.PARTIAL,
        ListeningContentStatus.FAILED,
      ] } }),
    },
    orderBy: [{ unit: { position: 'asc' } }, { position: 'asc' }],
    take: options.limit,
  });

  stats.considered = lessons.length;
  for (const lesson of lessons) {
    if (!lesson.sourceUrl) { stats.skipped++; continue; }
    const outcome = await fetchLessonHtml(lesson.sourceUrl);
    if (outcome.status === 'unavailable') {
      await markLessonStatus(prisma, lesson.id, ListeningContentStatus.UNAVAILABLE, outcome.note ?? null);
      stats.unavailable++;
      continue;
    }
    if (outcome.status === 'failed' || !outcome.html) {
      await markLessonStatus(prisma, lesson.id, ListeningContentStatus.FAILED, outcome.note ?? null);
      stats.failed++;
      continue;
    }
    const blocks = parseLessonContent(outcome.html);
    if (blocks.length === 0) {
      await markLessonStatus(prisma, lesson.id, ListeningContentStatus.FAILED, 'parser returned no blocks');
      stats.failed++;
      continue;
    }
    const bucket = classifyOutcome(blocks);
    await saveBlocks(prisma, lesson.id, blocks, bucket);
    stats.blocks += blocks.length;
    if (bucket === 'IMPORTED') stats.imported++;
    else stats.partial++;
  }
  return stats;
}

function printStats(stats: Stats) {
  const rows: [string, number][] = [
    ['lessons considered', stats.considered],
    ['imported', stats.imported],
    ['partial', stats.partial],
    ['unavailable (403/404/451)', stats.unavailable],
    ['failed (network / other HTTP)', stats.failed],
    ['skipped (no sourceUrl)', stats.skipped],
    ['content blocks written', stats.blocks],
  ];
  console.log('[tako-lako:content] import report');
  for (const [label, value] of rows) console.log(`  ${label.padEnd(32)} ${value}`);
}

async function main() {
  const limit = process.env.TAKO_LAKO_CONTENT_LIMIT
    ? Number(process.env.TAKO_LAKO_CONTENT_LIMIT)
    : undefined;
  const force = process.env.TAKO_LAKO_CONTENT_FORCE === '1';
  const prisma = new PrismaClient();
  try {
    const stats = await importTakoLakoContent(prisma, { limit, force });
    printStats(stats);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
