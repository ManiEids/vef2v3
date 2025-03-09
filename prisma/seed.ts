import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Minimal seed process started...");
  
  try {
    // Create a single test category
    const category = await prisma.category.create({
      data: {
        slug: 'test-category',
        title: 'Test Category',
      },
    });
    
    console.log(`✅ Created test category with ID: ${category.id}`);
    
    // Create a test question
    const question = await prisma.question.create({
      data: {
        question: 'This is a test question?',
        categoryId: category.id,
      },
    });
    
    console.log(`✅ Created test question with ID: ${question.id}`);
    
    // Create test answers
    await prisma.answer.create({
      data: {
        answer: 'Correct answer',
        correct: true,
        questionId: question.id,
      },
    });
    
    await prisma.answer.create({
      data: {
        answer: 'Wrong answer',
        correct: false,
        questionId: question.id,
      },
    });
    
    console.log("🎉 Test data seeded successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    return 1; // Error code
  } finally {
    await prisma.$disconnect();
  }
  
  return 0; // Success code
}

// Run the seeding script
main()
  .then((code) => {
    if (code !== 0) {
      console.error("Seed script failed");
    }
  })
  .catch((error) => {
    console.error("Unhandled error:", error);
  });
