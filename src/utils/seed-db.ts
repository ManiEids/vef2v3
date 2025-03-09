import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

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

  // Get absolute path to data directory
  const dataDir = path.resolve('./data');
  console.log(`📂 Reading data from: ${dataDir}`);
  
  let categories;
  try {
    const indexPath = path.join(dataDir, 'index.json');
    console.log(`📄 Reading index file: ${indexPath}`);
    categories = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
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
      const filePath = path.join(dataDir, file);
      console.log(`📄 Reading file: ${filePath}`);
      categoryData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
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
      // Changed from create to upsert to handle existing categories
      category = await prisma.category.upsert({
        where: { slug },
        update: { title }, // Update title if category exists
        create: {
          slug,
          title,
        },
      });
      console.log(`✅ Category upserted: ${title} with ID ${category.id}`);
    } catch (error) {
      console.error(`❌ Failed to process category ${title}: ${(error as Error).message}`);
      continue;
    }

    // Process questions for this category
    for (const q of categoryData.questions) {
      if (!q.question || !Array.isArray(q.answers)) {
        console.warn(`⚠️ Skipping invalid question in category ${title}`);
        continue;
      }
      
      try {
        // Check if question already exists (approximate matching by text and category)
        const existingQuestion = await prisma.question.findFirst({
          where: {
            question: q.question,
            categoryId: category.id,
          },
        });

        if (existingQuestion) {
          console.log(`⏩ Question already exists: "${q.question.substring(0, 30)}..."`);
          continue; // Skip to avoid duplicate questions
        }

        const question = await prisma.question.create({
          data: {
            question: q.question,
            categoryId: category.id,
          },
        });
        console.log(`✅ Created question: "${q.question.substring(0, 30)}..." with ID ${question.id}`);

        // Process answers for this question
        for (const a of q.answers) {
          if (!a || typeof a.answer !== 'string' || typeof a.correct !== 'boolean') {
            console.warn(`⚠️ Skipping invalid answer for question ID ${question.id}`);
            continue;
          }
          
          await prisma.answer.create({
            data: {
              answer: a.answer,
              correct: a.correct,
              questionId: question.id,
            },
          });
          console.log(`✅ Created answer: "${a.answer.substring(0, 30)}..."`);
        }
      } catch (error) {
        console.error(`❌ Failed to process question: ${(error as Error).message}`);
      }
    }
  }

  console.log("🎉 Seeding completed successfully!");
}

// Run the seeding script
main()
  .catch((error: unknown) => {
    console.error('❌ Seeding failed:', (error as Error).message);
    // Using process.exitCode instead of process.exit() to allow for clean shutdown
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
