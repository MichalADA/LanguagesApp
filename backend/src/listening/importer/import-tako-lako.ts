/* eslint-disable no-console */
/**
 * Tako Lako importer.
 *
 * The catalog lives on takolako.org (a WordPress site that indexes the actual
 * lesson chapters hosted on utexas.pressbooks.pub/takolako). We fetch the
 * content-overview page, extract every Pressbooks chapter link, group them
 * by (unit, module, lesson) into one record per lesson, then upsert.
 *
 * Idempotent: `ListeningSource` upserted on slug, `ListeningUnit` upserted on
 * (sourceId, level, position), `ListeningLesson` upserted on `sourceUrl`
 * (the main lesson chapter URL). Re-running the script is a no-op modulo
 * fresh URLs.
 *
 * Explicitly does NOT fetch Pressbooks chapters here — they return 403 from
 * the container's egress. Transcripts, audio and lesson bodies are a later
 * step; this pass only imports the catalog metadata.
 *
 * Ran via `npm run import:tako-lako` and never at server startup.
 */
import { PrismaClient } from '@prisma/client';
import {
  parseCatalog,
  type GroupedLesson,
} from './tako-lako-parser';

const BASE_URL = process.env.TAKO_LAKO_BASE_URL ?? 'https://www.takolako.org';
const INDEX_URL =
  process.env.TAKO_LAKO_INDEX_URL ?? `${BASE_URL}/beginner/content-overview/`;
const SOURCE_SLUG = 'tako-lako';
const CATALOG_LEVEL = 'Beginner';

interface ImportStats {
  fetched: boolean;
  lessons: number;
  units: number;
  modules: number;
  lessonUrls: number;
  grammarUrls: number;
  vocabularyUrls: number;
  pronunciationUrls: number;
  videoUrls: number;
  created: number;
  updated: number;
  skipped: number;
}

const emptyStats = (): ImportStats => ({
  fetched: false,
  lessons: 0,
  units: 0,
  modules: 0,
  lessonUrls: 0,
  grammarUrls: 0,
  vocabularyUrls: 0,
  pronunciationUrls: 0,
  videoUrls: 0,
  created: 0,
  updated: 0,
  skipped: 0,
});

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'LexodromiaBot/0.1 (+https://lexodromia.local)' },
    });
    if (!response.ok) {
      console.warn(`[tako-lako] ${url} responded ${response.status}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.warn(`[tako-lako] fetch failed for ${url}:`, (error as Error).message);
    return null;
  }
}

async function ensureSource(prisma: PrismaClient) {
  return prisma.listeningSource.upsert({
    where: { slug: SOURCE_SLUG },
    update: {
      sourceUrl: BASE_URL,
    },
    create: {
      slug: SOURCE_SLUG,
      name: 'Tako Lako',
      description: 'Kurs chorwackiego z dialogami, nagraniami i transkrypcjami.',
      sourceUrl: BASE_URL,
      license: 'External — see takolako.org and utexas.pressbooks.pub/takolako',
      attribution: 'Tako Lako (takolako.org · UTexas Pressbooks)',
      type: 'TAKO_LAKO',
    },
  });
}

/**
 * A stable, deterministic position for a Module inside `Beginner`:
 * `unit * 100 + module` keeps the natural sort order (u1m1 < u1m2 < u2m1)
 * without colliding across units.
 */
const modulePosition = (unit: number, module: number): number => unit * 100 + module;

async function upsertUnit(
  prisma: PrismaClient,
  sourceId: string,
  unit: number,
  module: number,
) {
  const position = modulePosition(unit, module);
  const existing = await prisma.listeningUnit.findFirst({
    where: { sourceId, level: CATALOG_LEVEL, position },
  });
  const title = `Unit ${unit} · Module ${module}`;
  if (existing) {
    return prisma.listeningUnit.update({
      where: { id: existing.id },
      data: { title, unitNumber: unit, moduleNumber: module },
    });
  }
  return prisma.listeningUnit.create({
    data: {
      sourceId,
      title,
      level: CATALOG_LEVEL,
      position,
      unitNumber: unit,
      moduleNumber: module,
    },
  });
}

async function upsertLesson(
  prisma: PrismaClient,
  unitId: string,
  lesson: GroupedLesson,
): Promise<'created' | 'updated' | 'skipped'> {
  // Every lesson needs a stable primary key for the upsert. Prefer the main
  // Pressbooks URL; if only sibling URLs exist, synthesize a stable deep-link
  // from the (unit, module, lesson) triple so the row is still identifiable.
  const primaryUrl =
    lesson.lessonUrl
      ?? `https://utexas.pressbooks.pub/takolako/chapter/${lesson.key}/`;

  const data = {
    unitId,
    title: lesson.title ?? `Unit ${lesson.unit} · Module ${lesson.module} · Lesson ${lesson.lesson}`,
    position: lesson.lesson,
    lessonNumber: lesson.lesson,
    grammarUrl: lesson.grammarUrl,
    vocabularyUrl: lesson.vocabularyUrl,
    pronunciationUrl: lesson.pronunciationUrl,
    videoUrl: lesson.videoUrl,
  };

  const existing = await prisma.listeningLesson.findUnique({ where: { sourceUrl: primaryUrl } });
  if (existing) {
    const unchanged =
      existing.unitId === data.unitId
      && existing.title === data.title
      && existing.position === data.position
      && existing.lessonNumber === data.lessonNumber
      && existing.grammarUrl === data.grammarUrl
      && existing.vocabularyUrl === data.vocabularyUrl
      && existing.pronunciationUrl === data.pronunciationUrl
      && existing.videoUrl === data.videoUrl;
    if (unchanged) return 'skipped';
    await prisma.listeningLesson.update({ where: { id: existing.id }, data });
    return 'updated';
  }
  await prisma.listeningLesson.create({ data: { ...data, sourceUrl: primaryUrl } });
  return 'created';
}

export async function importTakoLako(prisma: PrismaClient): Promise<ImportStats> {
  const stats = emptyStats();
  const html = await fetchText(INDEX_URL);
  if (!html) {
    console.warn(`[tako-lako] index page unreachable (${INDEX_URL}); nothing imported.`);
    return stats;
  }
  stats.fetched = true;

  const grouped = parseCatalog(html);
  stats.lessons = grouped.length;
  stats.units = new Set(grouped.map((g) => g.unit)).size;
  stats.modules = new Set(grouped.map((g) => `u${g.unit}-m${g.module}`)).size;
  for (const lesson of grouped) {
    if (lesson.lessonUrl) stats.lessonUrls++;
    if (lesson.grammarUrl) stats.grammarUrls++;
    if (lesson.vocabularyUrl) stats.vocabularyUrls++;
    if (lesson.pronunciationUrl) stats.pronunciationUrls++;
    if (lesson.videoUrl) stats.videoUrls++;
  }

  if (grouped.length === 0) {
    console.warn('[tako-lako] no Pressbooks lesson links found on the overview page.');
    return stats;
  }

  const source = await ensureSource(prisma);
  for (const lesson of grouped) {
    const unit = await upsertUnit(prisma, source.id, lesson.unit, lesson.module);
    const outcome = await upsertLesson(prisma, unit.id, lesson);
    stats[outcome]++;
  }
  return stats;
}

function printStats(stats: ImportStats) {
  const rows: [string, number | string][] = [
    ['index fetched', stats.fetched ? 'yes' : 'no'],
    ['unique lessons detected', stats.lessons],
    ['units seen', stats.units],
    ['modules seen', stats.modules],
    ['lessonUrl', stats.lessonUrls],
    ['grammarUrl', stats.grammarUrls],
    ['vocabularyUrl', stats.vocabularyUrls],
    ['pronunciationUrl', stats.pronunciationUrls],
    ['videoUrl', stats.videoUrls],
    ['records created', stats.created],
    ['records updated', stats.updated],
    ['records skipped (unchanged)', stats.skipped],
  ];
  console.log('[tako-lako] import report');
  for (const [label, value] of rows) console.log(`  ${label.padEnd(28)} ${value}`);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const stats = await importTakoLako(prisma);
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
