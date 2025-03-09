import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

// Initialize Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Seeding process started...");

  // Path to the data folder
  const dataDir = './data';

  try {
    // Read the index.json file
    const categoriesData = JSON.parse(await fs.readFile(`${dataDir}/index.json`, 'utf-8'));
    console.log("✅ Read index.json:", categoriesData);

    for (const { title, file, slug } of categoriesData) {
      if (!title || !file) {
        console.warn(`⚠️ Skipping invalid category:`, { title, file, slug });
        continue;
      }

      // If slug is missing, generate one from the title
      const categorySlug = slug || title.toLowerCase().replace(/\s+/g, '-');

      // Check if the data file exists
      const filePath = path.join(dataDir, file);
      try {
        await fs.access(filePath);
      } catch {
        console.warn(`⚠️ Skipping category due to missing file: ${filePath}`);
        continue;
      }

      // Read the category file
      const categoryData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      if (!Array.isArray(categoryData.questions)) {
        console.warn(`⚠️ Skipping category due to missing/invalid questions: ${title}`);
        continue;
      }

      // Insert category and its questions into the database
      const category = await prisma.category.create({
        data: {
          slug: categorySlug,
          title,
          questions: {
            create: categoryData.questions
              .filter(q => q.question) // Ensure question exists
              .map(q => ({
                question: q.question,
                answers: {
                  create: (Array.isArray(q.answers) ? q.answers : []) // Ensure answers are an array
                    .filter(a => a.answer) // Ensure answer text exists
                    .map(a => ({
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

// Run the script
main();
