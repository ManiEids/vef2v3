import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const app = new Hono();
// Root endpoint
app.get('/', (c) => c.text('Hono Prisma API'));
// Get all categories
app.get('/categories', async (c) => {
    try {
        const categories = await prisma.category.findMany({
            include: { questions: true },
        });
        return c.json(categories);
    }
    catch (error) {
        console.error(error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
// Get single category by slug
app.get('/categories/:slug', async (c) => {
    const slug = c.req.param('slug');
    try {
        const category = await prisma.category.findUnique({
            where: { slug },
            include: { questions: true },
        });
        if (!category) {
            return c.json({ error: 'Category not found' }, 404);
        }
        return c.json(category);
    }
    catch (error) {
        console.error(error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
// Create new category
app.post('/category', async (c) => {
    const { slug, title } = await c.req.json();
    try {
        const newCategory = await prisma.category.create({
            data: { slug, title },
        });
        return c.json(newCategory, 201);
    }
    catch (error) {
        console.error(error);
        return c.json({ error: 'Invalid input or internal error' }, 400);
    }
});
// Update category by slug
app.patch('/category/:slug', async (c) => {
    const { slug } = c.req.param();
    const { title } = await c.req.json();
    try {
        const updatedCategory = await prisma.category.update({
            where: { slug },
            data: { title },
        });
        return c.json(updatedCategory);
    }
    catch (error) {
        console.error(error);
        return c.json({ error: 'Category not found or invalid input' }, 400);
    }
});
// Delete category by slug
app.delete('/category/:slug', async (c) => {
    const { slug } = c.req.param();
    try {
        await prisma.category.delete({ where: { slug } });
        return c.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        console.error(error);
        return c.json({ error: 'Category not found or internal error' }, 400);
    }
});
// Server setup
const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
console.log(`Server running on port ${port}`);
export { app };
