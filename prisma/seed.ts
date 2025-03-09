import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';

const prisma = new PrismaClient();

interface CategoryData {
  title: string;
  questions: QuestionData[];
}

interface QuestionData {
  question: string;
  answers: AnswerData[];
}

interface AnswerData {
  answer: string;
  correct: boolean;
}

const exitWithError = (): void => {
  console.error('Exiting with error');
  // Process will exit with code 1 after the script finishes
};

async function main(): Promise<void> {
  console.log("🔄 Seeding process started...");

  const dataDir = './data';
  let categories;
  try {
    categories = JSON.parse(await fs.readFile(`${dataDir}/index.json`, 'utf-8'));
  } catch (error) {
    console.error(`❌ Failed to read or parse index.json: ${(error as Error).message}`);
    exitWithError();
    return;
  }

  for (const { title, file } of categories) {
    if (!title || !file) {
      console.warn(`⚠️ Skipping invalid category: ${JSON.stringify({ title, file })}`);
      continue;
    }

    const slug = title.toLowerCase().replace(/\s+/g, '-');
    console.log(`📝 Processing category: ${title} (slug: ${slug})`);

    let categoryData: CategoryData;
    try {
      categoryData = JSON.parse(await fs.readFile(`${dataDir}/${file}`, 'utf-8'));
    } catch (error) {
      console.error(`❌ Failed to read or parse ${file}: ${(error as Error).message}`);
      continue;
    }

    if (!categoryData.questions || !Array.isArray(categoryData.questions)) {
      console.warn(`⚠️ No valid questions found for category: ${title}`);
      continue;
    }

    let category;
    try {
      category = await prisma.category.create({
        data: {
          slug,
          title,
        },
      });
    } catch (error) {
      console.error(`❌ Failed to create category ${title}: ${(error as Error).message}`);
      continue;
    }

    for (const q of categoryData.questions as QuestionData[]) {
      let question;
      try {
        question = await prisma.question.create({
          data: {
            question: q.question,
            categoryId: category.id,
          },
        });
      } catch (error) {
        console.error(`❌ Failed to create question ${q.question}: ${(error as Error).message}`);
        continue;
      }

      for (const a of q.answers || [] as AnswerData[]) {
        try {
          await prisma.answer.create({
            data: {
              answer: a.answer,
              correct: a.correct,
              questionId: question.id,
            },
          });
        } catch (error) {
          console.error(`❌ Failed to create answer ${a.answer}: ${(error as Error).message}`);
        }
      }
    }
    console.log(`✅ Created category: ${title}`);
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((error: unknown) => {
    console.error('❌ Seeding failed:', (error as Error).message);
    // Using process.exitCode instead of process.exit for cleaner shutdown
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
