import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { serve } from '@hono/node-server';
import xss from 'xss';

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize Hono app
const app = new Hono();

// Add middleware
app.use('*', logger());

// Define schemas for validation
const categorySchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
});

const answerSchema = z.object({
  answer: z.string().min(1),
  correct: z.boolean(),
});

const questionSchema = z.object({
  question: z.string().min(1),
  categoryId: z.number().int().positive(),
  answers: z.array(answerSchema),
});

// Sanitize input to prevent XSS
const sanitize = (input: string): string => xss(input);

// Category routes
app.get('/categories', async (c) => {
  try {
    const categories = await prisma.category.findMany();
    return c.json(categories, 200);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Root route to show project status
app.get('/', (c) => {
  return c.html(`
    <html>
      <head>
        <title>Quiz API</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; }
          h1 { color: #333; }
          .success { color: green; }
          ul { margin: 1rem 0; }
          li { margin: 0.5rem 0; }
          code { background: #f1f1f1; padding: 0.2rem 0.4rem; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>Quiz API</h1>
        <p class="success">✅ Server is running!</p>
        <h2>Available Endpoints:</h2>
        <ul>
          <li><code>GET /categories</code> - List all categories</li>
          <li><code>GET /categories/:slug</code> - Get details for a specific category</li>
          <li><code>GET /questions</code> - List all questions</li>
          <li><code>GET /questions/category/:slug</code> - Get questions for a specific category</li>
        </ul>
      </body>
    </html>
  `);
});

app.get('/categories/:slug', async (c) => {
  try {
    const { slug } = c.req.param();
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }

    return c.json(category, 200);
  } catch (error) {
    console.error('Error fetching category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Question routes
app.get('/questions', async (c) => {
  try {
    const questions = await prisma.question.findMany({
      include: {
        answers: true,
        category: true,
      },
    });
    return c.json(questions, 200);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/questions/category/:slug', async (c) => {
  try {
    const { slug } = c.req.param();
    const category = await prisma.category.findUnique({
      where: { slug },
    });

    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }

    const questions = await prisma.question.findMany({
      where: { categoryId: category.id },
      include: {
        answers: true,
      },
    });

    return c.json(questions, 200);
  } catch (error) {
    console.error('Error fetching questions by category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Simplify server startup - Hardcode port to avoid process.env issues
const port = 3000;
// Always start the server, no conditional check
console.log(`Server is running on port ${port}`);
serve({
  fetch: app.fetch,
  port,
});

export default app;