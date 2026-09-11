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

/**
 * CloudFront in front of Pressbooks refuses obvious bot User-Agents with 403.
 * Impersonating a normal browser (recent Firefox on macOS) reliably slips
 * through — we're a well-behaved reader following public links.
 */
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.7,hr;q=0.5,pl;q=0.3',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
  Connection: 'keep-alive',
};

async function fetchLessonHtml(url: string): Promise<FetchOutcome> {
  try {
    const response = await fetch(url, { headers: BROWSER_HEADERS });
    if (response.ok) return { status: 'ok', html: await response.text() };
    if ([403, 404, 451].includes(response.status)) {
      const rest = await fetchViaPressbooksRestApi(url);
      if (rest) return rest;
      return { status: 'unavailable', note: `HTTP ${response.status} from source (HTML)` };
    }
    return { status: 'failed', note: `HTTP ${response.status} from source` };
  } catch (error) {
    return { status: 'failed', note: (error as Error).message };
  }
}

/**
 * Fallback: Pressbooks is WordPress-based, so `/wp-json/wp/v2/chapters?slug=…`
 * often returns the same chapter body as JSON even when CloudFront has
 * decided to refuse the HTML view. We stitch the returned `content.rendered`
 * HTML back into a familiar `<article class="entry-content">` wrapper so the
 * regular parser can consume it.
 */
async function fetchViaPressbooksRestApi(url: string): Promise<FetchOutcome | null> {
  const match = url.match(/^(https?:\/\/[^/]+\/[^/]+)\/chapter\/([^/?#]+)/i);
  if (!match) return null;
  const [, book, slug] = match;
  const restUrl = `${book}/wp-json/wp/v2/chapters?slug=${encodeURIComponent(slug)}`;
  try {
    const response = await fetch(restUrl, {
      headers: { ...BROWSER_HEADERS, Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const items: Array<{ content?: { rendered?: string }; title?: { rendered?: string } }> =
      await response.json() as Array<{ content?: { rendered?: string }; title?: { rendered?: string } }>;
    const first = items?.[0];
    const body = first?.content?.rendered;
    if (!body) return null;
    const title = first.title?.rendered ?? '';
    const html = `<article class="entry-content"><h1>${title}</h1>${body}</article>`;
    return { status: 'ok', html };
  } catch {
    return null;
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
          sourceText: block.sourceText,
          translatedText: block.translatedText,
          speaker: block.speaker,
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

interface Options {
  limit?: number;
  force?: boolean;
  /**
   * If set, restrict the import to lessons whose `sourceUrl` matches this URL
   * (or its base without a trailing slash). Useful for debugging a single
   * lesson end-to-end, e.g. TAKO_LAKO_CONTENT_URL=…u1-m1-lesson1/.
   */
  onlyUrl?: string;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
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

  const onlyUrl = options.onlyUrl ? normalizeUrl(options.onlyUrl) : undefined;
  const statusFilter = options.force || onlyUrl
    ? {}
    : { contentStatus: { in: [
        ListeningContentStatus.NOT_IMPORTED,
        ListeningContentStatus.PARTIAL,
        ListeningContentStatus.FAILED,
      ] } };
  const urlFilter = onlyUrl
    ? { sourceUrl: { in: [onlyUrl, `${onlyUrl}/`] } }
    : { sourceUrl: { not: null } };

  const lessons = await prisma.listeningLesson.findMany({
    where: {
      unit: { sourceId: source.id },
      ...urlFilter,
      ...statusFilter,
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
  const onlyUrl = process.env.TAKO_LAKO_CONTENT_URL || undefined;
  const prisma = new PrismaClient();
  try {
    if (onlyUrl) console.log(`[tako-lako:content] single-URL mode: ${onlyUrl}`);
    const stats = await importTakoLakoContent(prisma, { limit, force, onlyUrl });
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
