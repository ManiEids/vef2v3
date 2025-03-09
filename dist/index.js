import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
const prisma = new PrismaClient();
const app = new Hono();
// Health check
app.get('/', (c) => c.text('Hono Prisma API'));
// GET all categories
app.get('/categories', async (c) => {
    try {
        const categories = await prisma.category.findMany();
        return c.json(categories, 200);
    }
    catch (error) {
        console.error(error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
// GET single category by slug
app.get('/categories/:slug', async (c) => {
    const { slug } = c.req.param();
    try {
        const category = await prisma.category.findUnique({
            where: { slug },
            include: { questions: true },
        });
        if (!category) {
            return c.json({ error: 'Category not found' }, 404);
        }
        return c.json(category, 200);
    }
    catch (error) {
        console.error(error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
app.post('/category', async (c) => {
    const schema = z.object({
        slug: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
    });
    try {
        const data = schema.parse(await c.req.json());
        const newCategory = await prisma.category.create({
            data: {
                slug: data.slug,
                title: data.title,
                description: data.description,
            },
        });
        return c.json(newCategory, 201);
    }
    catch (error) {
        console.error(error);
        return c.json({ error: 'Invalid input or internal error' }, 400);
    }
});
app.patch('/category/:slug', async (c) => {
    const schema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
    });
    try {
        const slug = c.req.param('slug');
        const data = schema.parse(await c.req.json());
        const updatedCategory = await prisma.category.update({
            where: { slug },
            data,
        });
        return c.json(updatedCategory, 200);
    }
    catch (error) {
        console.error(error);
        return c.json({ error: 'Category not found or invalid input' }, 400);
    }
});
app.delete('/category/:slug', async (c) => {
    try {
        const slug = c.req.param('slug');
        await prisma.category.delete({ where: { slug } });
        return c.body(null, 204);
    }
    catch (error) {
        console.error(error);
        return c.json({ error: 'Category not found' }, 404);
    }
});
// Root route
app.get('/', (c) => c.text('Hono Prisma API'));
// Server setup
const prisma = new PrismaClient();
const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
// Export app for testing purposes
export { app };
