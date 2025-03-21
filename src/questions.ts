import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const app = new Hono();
const prisma = new PrismaClient();

// Define schemas for validation
const questionSchema = z.object({
  question: z.string(),
  categoryId: z.number(),
  answers: z.array(z.object({
    answer: z.string(),
    correct: z.boolean(),
  })),
});

// GET /questions
app.get('/questions', async (c) => {
  try {
    const questions = await prisma.question.findMany();
    return c.json(questions);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// GET /questions/:id
app.get('/questions/:id', async (c) => {
  const { id } = c.req.param();
  try {
    const question = await prisma.question.findUnique({ 
      where: { id: Number(id) },
      include: { answers: true }
    });
    
    if (!question) {
      return c.json({ error: 'Not Found' }, 404);
    }
    return c.json(question);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// POST /question
app.post('/question', async (c) => {
  const body = await c.req.json();
  const result = questionSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Bad Request' }, 400);
  }
  
  try {
    // Use proper Prisma nested creation syntax
    const question = await prisma.question.create({ 
      data: {
        question: result.data.question,
        categoryId: result.data.categoryId,
        answers: {
          create: result.data.answers.map(a => ({
            answer: a.answer,
            correct: a.correct
          }))
        }
      },
      include: {
        answers: true
      }
    });
    return c.json(question, 201);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// PATCH /question/:id
app.patch('/question/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const result = questionSchema.partial().safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Bad Request' }, 400);
  }
  
  try {
    // Extract only the valid fields that can be updated
    const data: any = {};
    
    if (result.data.question) {
      data.question = result.data.question;
    }
    
    if (result.data.categoryId) {
      data.categoryId = result.data.categoryId;
    }
    
    const question = await prisma.question.update({
      where: { id: Number(id) },
      data
    });
    return c.json(question);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return c.json({ error: 'Not Found' }, 404);
    }
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// DELETE /question/:id
app.delete('/question/:id', async (c) => {
  const { id } = c.req.param();
  try {
    await prisma.question.delete({ where: { id: Number(id) } });
    // Use null for 204 responses
    return c.body(null, 204);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return c.json({ error: 'Not Found' }, 404);
    }
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default app;
