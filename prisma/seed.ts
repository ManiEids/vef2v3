import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';

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

async function main() {
  console.log("🔄 Seeding process started...");

  const dataDir = './data';
  let categories;
  try {
    categories = JSON.parse(await fs.readFile(`${dataDir}/index.json`, 'utf-8'));
  } catch (error) {
    console.error(`❌ Failed to read or parse index.json: ${(error as any).message}`);
    process.exit(1);
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
      console.error(`❌ Failed to read or parse ${file}: ${(error as any).message}`);
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
      console.error(`❌ Failed to create category ${title}: ${(error as any).message}`);
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
        console.error(`❌ Failed to create question ${q.question}: ${(error as any).message}`);
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
          console.error(`❌ Failed to create answer ${a.answer}: ${(error as any).message}`);
        }
      }
    }
    console.log(`✅ Created category: ${title}`);
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', (error as any).message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
