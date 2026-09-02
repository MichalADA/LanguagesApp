import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    update: { name: 'Polski → Chorwacki' },
    create: {
      slug: 'pl-hr',
      name: 'Polski → Chorwacki',
      sourceLanguageId: pl.id,
      targetLanguageId: hr.id,
    },
  });

  console.log('Seed complete: 3 languages, 1 course (pl-hr).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
