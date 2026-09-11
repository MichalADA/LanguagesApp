const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Starter Tako Lako content. Two demo lessons per level with full content
 * blocks — enough for the Listening UI to render the target UX (headings,
 * paragraphs, transcripts, attribution) on a fresh install without running
 * the content scraper. The importer upserts on top of this seed by
 * lesson.sourceUrl, so nothing is duplicated when it eventually runs.
 */
const TAKO_LAKO_SEED = {
  slug: 'tako-lako',
  name: 'Tako Lako',
  description: 'Kurs chorwackiego z dialogami, nagraniami i transkrypcjami.',
  sourceUrl: 'https://www.takolako.org',
  license: 'CC BY-SA',
  attribution: 'Tako Lako (takolako.org · UTexas Pressbooks)',
  type: 'TAKO_LAKO',
  units: [
    {
      level: 'Beginner',
      position: 101,
      unitNumber: 1,
      moduleNumber: 1,
      title: 'Unit 1 · Module 1',
      lessons: [
        {
          position: 1,
          lessonNumber: 1,
          title: 'Module 1 – Lesson 1: Dobar dan!',
          sourceUrl: 'https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson1/',
          audioUrl: null,
          videoUrl: null,
          transcript: null,
          contentStatus: 'IMPORTED',
          blocks: [
            { type: 'HEADING', sourceText: 'Naši studenti', translatedText: 'Nasi studenci', metadata: { level: 2 } },
            { type: 'PARAGRAPH', translatedText: 'Poznaj naszych bohaterów: Anę i Marka. Uczą się chorwackiego razem z Tobą.' },
            { type: 'TRANSCRIPT', sourceText: 'Ana: Dobar dan!\nMarko: Dobar dan, kako si?\nAna: Dobro sam, hvala. A ti?\nMarko: I ja sam dobro.', translatedText: 'Ana: Dzień dobry!\nMarko: Dzień dobry, jak się masz?\nAna: Dobrze, dziękuję. A ty?\nMarko: Ja też dobrze.', metadata: { speakers: true } },
            { type: 'NOTE', translatedText: 'Zapamiętaj: „Dobar dan" to formalne powitanie, „Bok" — nieformalne.' },
          ],
        },
        {
          position: 2,
          lessonNumber: 2,
          title: 'Module 1 – Lesson 2: Predstavljanje',
          sourceUrl: 'https://utexas.pressbooks.pub/takolako/chapter/u1-m1-lesson2/',
          audioUrl: null,
          videoUrl: null,
          transcript: null,
          contentStatus: 'IMPORTED',
          blocks: [
            { type: 'HEADING', sourceText: 'Predstavljanje', translatedText: 'Przedstawianie się', metadata: { level: 2 } },
            { type: 'PARAGRAPH', translatedText: 'Nauczmy się przedstawiać po chorwacku.' },
            { type: 'TRANSCRIPT', sourceText: 'Mario: Kako se zoveš?\nLaura: Zovem se Laura. A ti?\nMario: Ja sam Mario.', translatedText: 'Mario: Jak masz na imię?\nLaura: Nazywam się Laura. A ty?\nMario: Jestem Mario.', metadata: { speakers: true } },
          ],
        },
      ],
    },
    {
      level: 'Beginner',
      position: 201,
      unitNumber: 2,
      moduleNumber: 1,
      title: 'Unit 2 · Module 1',
      lessons: [
        {
          position: 1,
          lessonNumber: 1,
          title: 'Module 1 – Lesson 1: Slobodno vrijeme',
          sourceUrl: 'https://utexas.pressbooks.pub/takolako/chapter/u2-m1-lesson1/',
          audioUrl: null,
          videoUrl: null,
          transcript: null,
          contentStatus: 'IMPORTED',
          blocks: [
            { type: 'HEADING', sourceText: 'Slobodno vrijeme', translatedText: 'Wolny czas', metadata: { level: 2 } },
            { type: 'PARAGRAPH', translatedText: 'Rozmowa o wolnym czasie i hobby.' },
            { type: 'TRANSCRIPT', sourceText: 'Mario: Što radiš u slobodno vrijeme?\nLaura: Često plivam i igram tenis.\nMario: Zapravo i ja volim tenis.', translatedText: 'Mario: Co robisz w wolnym czasie?\nLaura: Często pływam i gram w tenisa.\nMario: Właściwie ja też lubię tenis.', metadata: { speakers: true } },
          ],
        },
      ],
    },
  ],
};

async function seedListening() {
  const source = await prisma.listeningSource.upsert({
    where: { slug: TAKO_LAKO_SEED.slug },
    update: {
      name: TAKO_LAKO_SEED.name,
      description: TAKO_LAKO_SEED.description,
      sourceUrl: TAKO_LAKO_SEED.sourceUrl,
      license: TAKO_LAKO_SEED.license,
      attribution: TAKO_LAKO_SEED.attribution,
      type: TAKO_LAKO_SEED.type,
    },
    create: {
      slug: TAKO_LAKO_SEED.slug,
      name: TAKO_LAKO_SEED.name,
      description: TAKO_LAKO_SEED.description,
      sourceUrl: TAKO_LAKO_SEED.sourceUrl,
      license: TAKO_LAKO_SEED.license,
      attribution: TAKO_LAKO_SEED.attribution,
      type: TAKO_LAKO_SEED.type,
    },
  });

  for (const unit of TAKO_LAKO_SEED.units) {
    const existing = await prisma.listeningUnit.findFirst({
      where: { sourceId: source.id, level: unit.level, position: unit.position },
    });
    const dbUnit = existing
      ? await prisma.listeningUnit.update({
          where: { id: existing.id },
          data: { title: unit.title, unitNumber: unit.unitNumber, moduleNumber: unit.moduleNumber },
        })
      : await prisma.listeningUnit.create({
          data: {
            sourceId: source.id,
            title: unit.title,
            level: unit.level,
            position: unit.position,
            unitNumber: unit.unitNumber,
            moduleNumber: unit.moduleNumber,
          },
        });

    for (const lesson of unit.lessons) {
      const savedLesson = await prisma.listeningLesson.upsert({
        where: { sourceUrl: lesson.sourceUrl },
        update: {
          unitId: dbUnit.id,
          title: lesson.title,
          position: lesson.position,
          lessonNumber: lesson.lessonNumber,
          audioUrl: lesson.audioUrl,
          videoUrl: lesson.videoUrl,
          transcript: lesson.transcript,
          contentStatus: lesson.contentStatus,
          contentImportedAt: new Date(),
        },
        create: {
          unitId: dbUnit.id,
          title: lesson.title,
          position: lesson.position,
          lessonNumber: lesson.lessonNumber,
          sourceUrl: lesson.sourceUrl,
          audioUrl: lesson.audioUrl,
          videoUrl: lesson.videoUrl,
          transcript: lesson.transcript,
          contentStatus: lesson.contentStatus,
          contentImportedAt: new Date(),
        },
      });
      // Replace this lesson's blocks with the seeded ones so the seed stays
      // authoritative — a later real import will overwrite them by the same
      // mechanism.
      await prisma.listeningContentBlock.deleteMany({ where: { lessonId: savedLesson.id } });
      if (lesson.blocks?.length) {
        await prisma.listeningContentBlock.createMany({
          data: lesson.blocks.map((block, index) => ({
            lessonId: savedLesson.id,
            type: block.type,
            position: index + 1,
            text: block.text ?? null,
            sourceText: block.sourceText ?? null,
            translatedText: block.translatedText ?? null,
            speaker: block.speaker ?? null,
            url: block.url ?? null,
            metadataJson: block.metadata ? JSON.stringify(block.metadata) : null,
          })),
        });
      }
    }
  }
}

async function main() {
  const languages = [
    { code: 'pl', name: 'Polski' },
    { code: 'hr', name: 'Hrvatski' },
    { code: 'en', name: 'English' },
  ];

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { name: lang.name },
      create: lang,
    });
  }

  const pl = await prisma.language.findUniqueOrThrow({ where: { code: 'pl' } });
  const hr = await prisma.language.findUniqueOrThrow({ where: { code: 'hr' } });

  await prisma.course.upsert({
    where: { slug: 'pl-hr' },
    update: {
      name: 'Polski → Chorwacki',
      sourceLanguageId: pl.id,
      targetLanguageId: hr.id,
    },
    create: {
      slug: 'pl-hr',
      name: 'Polski → Chorwacki',
      sourceLanguageId: pl.id,
      targetLanguageId: hr.id,
    },
  });

  await seedListening();

  console.log('Seed complete: 3 languages, 1 course (pl-hr), tako-lako source + demo lesson blocks.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
