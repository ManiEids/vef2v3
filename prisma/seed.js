import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
const prisma = new PrismaClient();
async function main() {
    const dataDir = './data';
    const categories = JSON.parse(await fs.readFile(`${dataDir}/index.json`, 'utf-8'));
    for (const { title, file } of categories) {
        if (!title || !file)
            continue;
        const categoryData = JSON.parse(await fs.readFile(`${dataDir}/${file}`, 'utf-8'));
        if (!categoryData.questions)
            continue;
        const category = await prisma.category.create({
            data: {
                slug: title.toLowerCase().replace(/\s+/g, '-'),
                title,
            },
        });
        for (const q of categoryData.questions) {
            const question = await prisma.question.create({
                data: {
                    question: q.question,
                    categoryId: category.id,
                },
            });
            for (const answer of q.answers) {
                await prisma.answer.create({
                    data: {
                        answer: answer.answer,
                        correct: answer.correct,
                        questionId: question.id,
                    },
                });
            }
        }
    }
    console.log('Database seeded successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
