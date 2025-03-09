import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.post.create({
    data: { title: "Hello World", content: "This is my first post" }
  });
  // ... you can create more initial records here ...
}
main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
