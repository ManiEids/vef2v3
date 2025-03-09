import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const app = new Hono();

app.get('/', (c) => c.text('Hono Prisma API'));

// Get all categories
app.get('/categories', async (c) => {
  const categories = await prisma.category.findMany();
  return c.json(categories);
});

// Get single category by slug
app.get('/categories/:slug', async (c) => {
  const { slug } = c.req.param();
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { questions: { include: { answers: true } } },
  });
  if (!category) return c.json({ error: 'Category not found' }, 404);
  return c.json(category);
});

// Create a new category
app.post('/category', async (c) => {
  const schema = z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
  });

  try {
    const data = schema.parse(await c.req.json());
    const newCategory = await prisma.category.create({ data });
    return c.json(newCategory, 201);
  } catch (error) {
    return c.json({ error: 'Invalid input or internal error' }, 400);
  }
});

// Delete a category
app.delete('/category/:slug', async (c) => {
  try {
    const { slug } = c.req.param();
    await prisma.category.delete({ where: { slug } });
    return c.body(null, 204);
  } catch (error) {
    return c.json({ error: 'Category not found' }, 404);
  }
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });

export { app };
