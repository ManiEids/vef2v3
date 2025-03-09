import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

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

  // Get absolute path to data directory
  const dataDir = path.resolve('./data');
  console.log(`📂 Reading data from: ${dataDir}`);
  
  let categories;
  try {
    const indexPath = path.join(dataDir, 'index.json');
    console.log(`📄 Reading index file: ${indexPath}`);
    categories = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
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
      const filePath = path.join(dataDir, file);
      console.log(`📄 Reading file: ${filePath}`);
      categoryData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
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
      console.log(`✅ Created category: ${title} with ID ${category.id}`);
    } catch (error) {
      console.error(`❌ Failed to create category ${title}: ${(error as any).message}`);
      continue;
    }

    for (const q of categoryData.questions as QuestionData[]) {
      if (!q.question) {
        console.warn(`⚠️ Skipping question without text`);
        continue;
      }
      
      let question;
      try {
        question = await prisma.question.create({
          data: {
            question: q.question,
            categoryId: category.id,
          },
        });
        console.log(`✅ Created question: "${q.question.substring(0, 30)}..." with ID ${question.id}`);
      } catch (error) {
        console.error(`❌ Failed to create question: ${(error as any).message}`);
        continue;
      }

      if (!Array.isArray(q.answers)) {
        console.warn(`⚠️ No valid answers for question: ${q.question.substring(0, 30)}...`);
        continue;
      }

      for (const a of q.answers) {
        if (!a || typeof a.answer !== 'string' || typeof a.correct !== 'boolean') {
          console.warn(`⚠️ Skipping invalid answer`);
          continue;
        }
        
        try {
          await prisma.answer.create({
            data: {
              answer: a.answer,
              correct: a.correct,
              questionId: question.id,
            },
          });
          console.log(`✅ Created answer: "${a.answer.substring(0, 30)}..."`);
        } catch (error) {
          console.error(`❌ Failed to create answer: ${(error as any).message}`);
        }
      }
    }
  }

  console.log("🎉 Seeding completed successfully!");
}

// Run the seeding script
main()
  .catch((error) => {
    console.error('❌ Seeding failed:', (error as any).message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
