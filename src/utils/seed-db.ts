import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Remote seeding disabled for stability");
  console.log("✅ Please use direct database management instead");
  
  // Just disconnect and exit
  await prisma.$disconnect();
}

// Run the simplified script 
main().catch(console.error);
