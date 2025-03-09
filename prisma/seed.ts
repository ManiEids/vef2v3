import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

// Initialize Prisma Client
const prisma = new PrismaClient();

interface Question {
  question: string;
  answers: { answer: string; correct: boolean }[];
}

async function main() {
  console.log("🔄 Seeding process started...");

  const dataDir = './data';

  try {
    const categoriesData: { title: string; file: string; slug?: string }[] = JSON.parse(
      await fs.readFile(`${dataDir}/index.json`, 'utf-8')
    );
    console.log("✅ Read index.json:", categoriesData);

    for (const { title, file, slug } of categoriesData) {
      if (!title || !file) {
        console.warn(`⚠️ Skipping invalid category:`, { title, file, slug });
        continue;
      }

      const categorySlug = slug || title.toLowerCase().replace(/\s+/g, '-');

      const filePath = path.join(dataDir, file);
      try {
        await fs.access(filePath);
      } catch {
        console.warn(`⚠️ Skipping category due to missing file: ${filePath}`);
        continue;
      }

      const categoryData: { questions: Question[] } = JSON.parse(
        await fs.readFile(filePath, 'utf-8')
      );

      if (!Array.isArray(categoryData.questions)) {
        console.warn(`⚠️ Skipping category due to missing/invalid questions: ${title}`);
        continue;
      }

      const category = await prisma.category.create({
        data: {
          slug: categorySlug,
          title,
          questions: {
            create: categoryData.questions
              .filter((q: Question) => q.question) // Ensure question exists
              .map((q: Question) => ({
                question: q.question,
                answers: {
                  create: (Array.isArray(q.answers) ? q.answers : [])
                    .filter((a: { answer: string; correct: boolean }) => a.answer)
                    .map((a: { answer: string; correct: boolean }) => ({
                      answer: a.answer,
                      correct: Boolean(a.correct),
                    })),
                },
              })),
          },
        },
      });

      console.log(`✅ Created category: ${category.title}`);
    }

    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
