import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';

const prisma = new PrismaClient();

async function main() {
  const dataDir = './data';
  const categoriesData = JSON.parse(await fs.readFile(`${dataDir}/index.json`, 'utf-8'));

  for (const { title, file, slug } of categoriesData) {
    if (!title || !file || !slug) continue;

    const categoryData = JSON.parse(await fs.readFile(`${dataDir}/${file}`, 'utf-8'));
    if (!categoryData.questions) continue;

    const category = await prisma.category.create({
      data: {
        slug,
        title,
        questions: {
          create: categoryData.questions.map((q: any) => ({
            question: q.question,
            answers: {
              create: q.answers.map((a: any) => ({
                answer: a.answer,
                correct: a.correct,
              })),
            },
          })),
        },
      },
    });

    console.log(`✅ Created category: ${category.title}`);
  }
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
