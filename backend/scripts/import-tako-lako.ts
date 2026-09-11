/* eslint-disable no-console */
/**
 * Tako Lako importer.
 *
 * Idempotent by design: units are upserted on (sourceId, level, position),
 * lessons on the lesson's own sourceUrl. Running the script twice on the same
 * catalog is a no-op. Ran via `npm run import:tako-lako` and NEVER at server
 * startup.
 *
 * If the network is blocked, the importer prints a warning and exits 0
 * without touching the database, so the seed content stays intact.
 */
import { PrismaClient } from '@prisma/client';
import {
  extractLessonLinks,
  parseLesson,
  type ParsedLesson,
} from '../src/listening/importer/tako-lako-parser';

const BASE_URL = process.env.TAKO_LAKO_BASE_URL ?? 'https://takolako.com';
const INDEX_URL = process.env.TAKO_LAKO_INDEX_URL ?? `${BASE_URL}/lessons`;
const SOURCE_SLUG = 'tako-lako';

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
    update: {},
    create: {
      slug: SOURCE_SLUG,
      name: 'Tako Lako',
      description: 'Kurs chorwackiego z dialogami, nagraniami i transkrypcjami.',
      sourceUrl: BASE_URL,
      license: 'External — see takolako.com',
      attribution: 'Tako Lako (takolako.com)',
      type: 'TAKO_LAKO',
    },
  });
}

async function saveLesson(
  prisma: PrismaClient,
  sourceId: string,
  url: string,
  order: number,
  parsed: ParsedLesson,
) {
  const unit = await prisma.listeningUnit.findFirst({
    where: { sourceId, level: parsed.level, position: parsed.unitPosition },
  });
  const dbUnit = unit
    ? await prisma.listeningUnit.update({
        where: { id: unit.id },
        data: { title: parsed.unitTitle },
      })
    : await prisma.listeningUnit.create({
        data: {
          sourceId,
          title: parsed.unitTitle,
          level: parsed.level,
          position: parsed.unitPosition,
        },
      });

  await prisma.listeningLesson.upsert({
    where: { sourceUrl: url },
    update: {
      unitId: dbUnit.id,
      title: parsed.title,
      position: order,
      audioUrl: parsed.audioUrl,
      videoUrl: parsed.videoUrl,
      transcript: parsed.transcript,
    },
    create: {
      unitId: dbUnit.id,
      title: parsed.title,
      position: order,
      sourceUrl: url,
      audioUrl: parsed.audioUrl,
      videoUrl: parsed.videoUrl,
      transcript: parsed.transcript,
    },
  });
}

export async function importTakoLako(prisma: PrismaClient): Promise<{ scraped: number; saved: number }> {
  const indexHtml = await fetchText(INDEX_URL);
  if (!indexHtml) {
    console.warn('[tako-lako] index page unreachable; nothing imported.');
    return { scraped: 0, saved: 0 };
  }
  const links = extractLessonLinks(indexHtml, BASE_URL, INDEX_URL);
  if (links.length === 0) {
    console.warn('[tako-lako] no lesson links found on the index; site layout may have changed.');
    return { scraped: 0, saved: 0 };
  }
  const source = await ensureSource(prisma);
  let saved = 0;
  for (let i = 0; i < links.length; i++) {
    const url = links[i];
    const html = await fetchText(url);
    if (!html) continue;
    const parsed = parseLesson(html, BASE_URL);
    await saveLesson(prisma, source.id, url, i + 1, parsed);
    saved++;
  }
  return { scraped: links.length, saved };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await importTakoLako(prisma);
    console.log(`[tako-lako] scraped ${result.scraped} lesson URLs, saved ${result.saved} lessons.`);
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
