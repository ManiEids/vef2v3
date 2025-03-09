import { PrismaClient } from '@prisma/client';

// Gagnagrunns tenging
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Fjarstýrð sáning óvirk");
  console.log("✅ Notaðu gagnagrunnsviðmót beint");
  
  // Aftengja
  await prisma.$disconnect();
}

// Keyra
main().catch(console.error);
