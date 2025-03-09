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

app.post('/category', async (c) => {
  try {
    const body = await c.req.json();
    const result = categorySchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid data', details: result.error.format() }, 400);
    }

    const { title } = result.data;
    // Generate slug if not provided
    const slug = result.data.slug || title.toLowerCase().replace(/\s+/g, '-');

    const category = await prisma.category.create({
      data: {
        title: sanitize(title),
        slug: sanitize(slug),
      },
    });

    return c.json(category, 201);
  } catch (error) {
    console.error('Error creating category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.patch('/category/:slug', async (c) => {
  try {
    const { slug } = c.req.param();
    const body = await c.req.json();
    const result = categorySchema.partial().safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid data', details: result.error.format() }, 400);
    }

    // Sanitize inputs
    const data = Object.fromEntries(
      Object.entries(result.data).map(([key, value]) => [key, typeof value === 'string' ? sanitize(value) : value])
    );

    try {
      const category = await prisma.category.update({
        where: { slug },
        data,
      });
      return c.json(category, 200);
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return c.json({ error: 'Category not found' }, 404);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.delete('/category/:slug', async (c) => {
  try {
    const { slug } = c.req.param();
    try {
      // First delete all associated questions and answers (using cascade in database would be better)
      const category = await prisma.category.findUnique({
        where: { slug },
        include: { questions: { include: { answers: true } } },
      });

      if (!category) {
        return c.json({ error: 'Category not found' }, 404);
      }

      // Delete in reverse order to avoid foreign key constraints
      for (const question of category.questions) {
        await prisma.answer.deleteMany({
          where: { questionId: question.id },
        });
      }

      await prisma.question.deleteMany({
        where: { categoryId: category.id },
      });

      await prisma.category.delete({
        where: { slug },
      });

      return c.body(null, 204);
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return c.json({ error: 'Category not found' }, 404);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting category:', error);
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

app.post('/question', async (c) => {
  try {
    const body = await c.req.json();
    const result = questionSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid data', details: result.error.format() }, 400);
    }

    const { question, categoryId, answers } = result.data;

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return c.json({ error: 'Category not found' }, 400);
    }

    // Create question with answers
    const newQuestion = await prisma.question.create({
      data: {
        question: sanitize(question),
        categoryId,
        answers: {
          create: answers.map(a => ({
            answer: sanitize(a.answer),
            correct: a.correct,
          })),
        },
      },
      include: {
        answers: true,
      },
    });

    return c.json(newQuestion, 201);
  } catch (error) {
    console.error('Error creating question:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.patch('/question/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID' }, 400);
    }

    const body = await c.req.json();
    const result = questionSchema.partial().safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid data', details: result.error.format() }, 400);
    }

    // Extract validated data
    const { question, categoryId } = result.data;
    const data: any = {};

    if (question) {
      data.question = sanitize(question);
    }

    if (categoryId) {
      // Verify category exists
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!categoryExists) {
        return c.json({ error: 'Category not found' }, 400);
      }

      data.categoryId = categoryId;
    }

    try {
      const updatedQuestion = await prisma.question.update({
        where: { id },
        data,
        include: {
          answers: true,
        },
      });

      return c.json(updatedQuestion, 200);
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return c.json({ error: 'Question not found' }, 404);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating question:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.delete('/question/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID' }, 400);
    }

    try {
      // First delete all associated answers
      await prisma.answer.deleteMany({
        where: { questionId: id },
      });

      await prisma.question.delete({
        where: { id },
      });

      return c.body(null, 204);
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return c.json({ error: 'Question not found' }, 404);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting question:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Development-only seed endpoint (remove in production)
if (process.env.NODE_ENV !== 'production') {
  app.post('/_seed', async (c) => {
    try {
      const { exec } = await import('child_process');
      exec('npx prisma db seed', (error, stdout, stderr) => {
        if (error) {
          console.error(`Seed error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`Seed stderr: ${stderr}`);
          return;
        }
        console.log(`Seed stdout: ${stdout}`);
      });
      return c.json({ message: 'Seeding started in background' });
    } catch (error) {
      console.error('Error triggering seed:', error);
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });
}

// Start server
const port = process.env.PORT || 3000;
console.log(`Server is running on port ${port}`);

export default app;

// Only start server if not imported by a test file
if (process.env.NODE_ENV !== 'test') {
  serve({
    fetch: app.fetch,
    port: Number(port),
  });
}