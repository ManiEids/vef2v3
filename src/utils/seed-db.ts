import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Remote seeding process started...");

  try {
    const dataDir = './data';
    const indexContent = await readFile(`${dataDir}/index.json`, 'utf-8');
    const categories = JSON.parse(indexContent);
    
    for (const item of categories) {
      if (!item.title || !item.file) {
        console.warn(`⚠️ Skipping invalid category entry`);
        continue;
      }
      
      const { title, file } = item;
      const slug = title.toLowerCase().replace(/\s+/g, '-');
      
      try {
        const fileContent = await readFile(`${dataDir}/${file}`, 'utf-8');
        const categoryData = JSON.parse(fileContent);
        
        if (!categoryData.questions || !Array.isArray(categoryData.questions)) {
          console.warn(`⚠️ No valid questions found for category: ${title}`);
          continue;
        }
        
        // Use upsert to handle existing categories
        console.log(`📝 Processing category: ${title}`);
        const category = await prisma.category.upsert({
          where: { slug },
          update: { title },
          create: { slug, title }
        });
        
        // Process questions, skipping existing ones
        for (const q of categoryData.questions) {
          if (!q.question || !Array.isArray(q.answers)) continue;
          
          // Check for existing question
          const existingQuestion = await prisma.question.findFirst({
            where: {
              question: q.question,
              categoryId: category.id
            }
          });
          
          if (existingQuestion) {
            console.log(`⏩ Question already exists: "${q.question.slice(0, 30)}..."`);
            continue;
          }
          
          const question = await prisma.question.create({
            data: {
              question: q.question,
              categoryId: category.id
            }
          });
          
          for (const a of q.answers) {
            if (!a || typeof a.answer !== 'string') continue;
            
            await prisma.answer.create({
              data: {
                answer: a.answer,
                correct: !!a.correct,
                questionId: question.id
              }
            });
          }
        }
        console.log(`✅ Processed category: ${title}`);
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error);
      }
    }
    
    console.log("🎉 Remote seeding completed successfully!");
  } catch (error) {
    console.error("❌ Remote seeding failed:", error);
    // Exit with error code
    process.exit(1);
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
}

// Run the seeding script
main();
