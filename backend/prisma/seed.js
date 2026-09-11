const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Starter Tako Lako content. Two demo lessons per level — enough for the
 * Listening UI to show real data on a fresh install. The full catalog is
 * populated by `npm run import:tako-lako`, which upserts on top of this seed
 * so nothing is duplicated when the scraper runs later.
 */
const TAKO_LAKO_SEED = {
  slug: 'tako-lako',
  name: 'Tako Lako',
  description: 'Kurs chorwackiego z dialogami, nagraniami i transkrypcjami.',
  sourceUrl: 'https://takolako.com',
  license: 'External — see takolako.com',
  attribution: 'Tako Lako (takolako.com)',
  type: 'TAKO_LAKO',
  units: [
    {
      level: 'Beginner',
      position: 1,
      title: 'Prvi susret',
      lessons: [
        {
          position: 1,
          title: 'Pozdravi',
          sourceUrl: 'https://takolako.com/lessons/pozdravi',
          audioUrl: null,
          videoUrl: null,
          transcript:
            'Mario: Bok! Kako si?\nLaura: Dobro sam, hvala. A ti?\nMario: I ja sam dobro.',
        },
        {
          position: 2,
          title: 'Predstavljanje',
          sourceUrl: 'https://takolako.com/lessons/predstavljanje',
          audioUrl: null,
          videoUrl: null,
          transcript:
            'Mario: Kako se zoveš?\nLaura: Zovem se Laura. A ti?\nMario: Ja sam Mario.',
        },
      ],
    },
    {
      level: 'Intermediate',
      position: 1,
      title: 'Slobodno vrijeme',
      lessons: [
        {
          position: 1,
          title: 'Hobiji',
          sourceUrl: 'https://takolako.com/lessons/hobiji',
          audioUrl: null,
          videoUrl: null,
          transcript:
            'Mario: Što radiš u slobodno vrijeme?\nLaura: Često plivam i igram tenis.\nMario: Zapravo i ja volim tenis.',
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
          data: { title: unit.title },
        })
      : await prisma.listeningUnit.create({
          data: {
            sourceId: source.id,
            title: unit.title,
            level: unit.level,
            position: unit.position,
          },
        });

    for (const lesson of unit.lessons) {
      await prisma.listeningLesson.upsert({
        where: { sourceUrl: lesson.sourceUrl },
        update: {
          unitId: dbUnit.id,
          title: lesson.title,
          position: lesson.position,
          audioUrl: lesson.audioUrl,
          videoUrl: lesson.videoUrl,
          transcript: lesson.transcript,
        },
        create: {
          unitId: dbUnit.id,
          title: lesson.title,
          position: lesson.position,
          sourceUrl: lesson.sourceUrl,
          audioUrl: lesson.audioUrl,
          videoUrl: lesson.videoUrl,
          transcript: lesson.transcript,
        },
      });
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

  console.log('Seed complete: 3 languages, 1 course (pl-hr), 1 listening source (tako-lako).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
