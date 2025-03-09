import { PrismaClient } from '@prisma/client';

// Gagnagrunnstenging
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Sáning hafin...");
  
  try {
    // Búa til flokk
    const category = await prisma.category.create({
      data: {
        slug: 'test-category',
        title: 'Test Category',
      },
    });
    
    console.log(`✅ Flokkur búinn til: ${category.id}`);
    
    // Búa til spurningu
    const question = await prisma.question.create({
      data: {
        question: 'This is a test question?',
        categoryId: category.id,
      },
    });
    
    console.log(`✅ Spurning búin til: ${question.id}`);
    
    // Búa til svör
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
    
    console.log("🎉 Sáning tókst!");
  } catch (error) {
    console.error("❌ Villa:", error);
    return 1; // Villa
  } finally {
    await prisma.$disconnect();
  }
  
  return 0; // OK
}

// Keyra
main()
  .then((code) => {
    if (code !== 0) {
      console.error("Sáning mistókst");
    }
  })
  .catch((error) => {
    console.error("Villa:", error);
  });
