import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from '@hono/cors';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { serve } from '@hono/node-server';
import xss from 'xss';

// Gagna tenging
const prisma = new PrismaClient();

// Hono app
const app = new Hono();

// Middleware
app.use('*', logger());
// Add CORS middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['https://vef2v4-seven.vercel.app', 'http://localhost:3000'];

app.use('*', cors({
  origin: allowedOrigins,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 600,
  credentials: true,
}));

// Add this before your routes
app.use('*', async (c, next) => {
  console.log(`Request from: ${c.req.header('Origin') || 'Unknown origin'}`);
  console.log(`Request path: ${c.req.path}`);
  console.log(`Request method: ${c.req.method}`);
  await next();
});

// Skilgreiningar
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

// XSS vörn
const sanitize = (input: string): string => xss(input);

// Forsíða
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
        <p class="success">✅ Þjónn keyrandi!</p>
        <h2>Endapunktar:</h2>
        <ul>
          <li><code>GET /categories</code> - Allir flokkar</li>
          <li><code>GET /categories/:slug</code> - Sækja flokk</li>
          <li><code>POST /category</code> - Búa til flokk</li>
          <li><code>PATCH /category/:slug</code> - Uppfæra flokk</li>
          <li><code>DELETE /category/:slug</code> - Eyða flokki</li>
          <li><code>GET /questions</code> - Allar spurningar</li>
          <li><code>GET /questions/category/:slug</code> - Spurningar í flokk</li>
          <li><code>POST /question</code> - Búa til spurningu</li>
          <li><code>PATCH /question/:id</code> - Uppfæra spurningu</li>
          <li><code>DELETE /question/:id</code> - Eyða spurningu</li>
        </ul>
      </body>
    </html>
  `);
});

// Flokkar
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
    // Búa til slug
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

    // Hreinsa gögn
    const data = {};
    if (result.data.title) {
      data['title'] = sanitize(result.data.title);
    }
    if (result.data.slug) {
      data['slug'] = sanitize(result.data.slug);
    }

    try {
      const category = await prisma.category.update({
        where: { slug },
        data,
      });
      return c.json(category, 200);
    } catch (error) {
      if (error.code === 'P2025') {
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
    
    // Finna flokk
    const category = await prisma.category.findUnique({
      where: { slug },
      include: { 
        questions: true 
      }
    });

    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }

    // Eyða svörum
    for (const question of category.questions) {
      await prisma.answer.deleteMany({
        where: { questionId: question.id }
      });
    }

    // Eyða spurningum
    await prisma.question.deleteMany({
      where: { categoryId: category.id }
    });

    // Eyða flokki
    await prisma.category.delete({
      where: { slug }
    });

    return c.body(null, 204);
  } catch (error) {
    console.error('Error deleting category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Spurningar
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

    // Athuga flokk
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return c.json({ error: 'Category not found' }, 400);
    }

    // Búa til spurningu
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

    // Sía gögn
    const { question, categoryId } = result.data;
    const data = {};

    if (question) {
      data['question'] = sanitize(question);
    }

    if (categoryId) {
      // Athuga flokk
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!categoryExists) {
        return c.json({ error: 'Category not found' }, 400);
      }

      data['categoryId'] = categoryId;
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
      if (error.code === 'P2025') {
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
      // Eyða svörum
      await prisma.answer.deleteMany({
        where: { questionId: id },
      });

      await prisma.question.delete({
        where: { id },
      });

      return c.body(null, 204);
    } catch (error) {
      if (error.code === 'P2025') {
        return c.json({ error: 'Question not found' }, 404);
      }
      throw error;endpoint for testings.env.PORT || 3000;
    }app.get('/ping', (c) => {export default app;
  } catch (error) {on({
    console.error('Error deleting question:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }s: 'enabled',
});Date().toISOString()
ss.env.PORT || 3000;
export default app;








});  port,  fetch: app.fetch,serve({console.log(`Server is running on port ${port}`);const port = 3000;// Keyra þjón
ss.env.PORT || 3000;
export default app;

// Keyra þjón
const port = 3000;
console.log(`Server is running on port ${port}`);
serve({
  fetch: app.fetch,
  port,
});