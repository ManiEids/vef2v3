import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Seeding process started...");

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
        
        // Try to create the category
        console.log(`📝 Creating category: ${title}`);
        const category = await prisma.category.create({
          data: { slug, title }
        });
        
        // Create questions and answers
        for (const q of categoryData.questions) {
          if (!q.question || !Array.isArray(q.answers)) continue;
          
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
    
    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error; // Re-throw to trigger the catch block below
  }
}

// Run the seeding script
main()
  .catch(e => {
    console.error(e);
    // Exit with error code
    process.exit(1);
  })
  .finally(async () => {
    // Disconnect Prisma client
    await prisma.$disconnect();
  });
