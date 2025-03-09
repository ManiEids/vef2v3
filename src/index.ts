import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = new Hono();

// Health check or root route (optional)
app.get('/', (c) => c.text('Hono Prisma API'));

// CRUD Endpoints for Post
app.get('/posts', async (c) => {
  try {
    const posts = await prisma.post.findMany();
    return c.json(posts);  // Return all posts as JSON
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/posts/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID format' }, 400);
    }
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    return c.json(post);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.post('/posts', async (c) => {
  try {
    const data = await c.req.json();
    const { title, content } = data;
    if (!title || !content) {
      // Basic validation for required fields
      return c.json({ error: 'Missing title or content' }, 400);
    }
    const newPost = await prisma.post.create({ data: { title, content } });
    return c.json(newPost, 201);  // Return the created post with 201 Created
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.put('/posts/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID format' }, 400);
    }
    const data = await c.req.json();
    const { title, content } = data;
    if (!title || !content) {
      return c.json({ error: 'Missing title or content' }, 400);
    }
    // Check if the post exists
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ error: 'Post not found' }, 404);
    }
    const updatedPost = await prisma.post.update({
      where: { id },
      data: { title, content }
    });
    return c.json(updatedPost);  // Return the updated post
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.delete('/posts/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID format' }, 400);
    }
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ error: 'Post not found' }, 404);
    }
    await prisma.post.delete({ where: { id } });
    return c.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Start the server (listen on port 3000 or Render's port)
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
if (process.env.NODE_ENV !== 'test') {
  serve({ fetch: app.fetch, port });
}

// Export app for testing purposes
export { app };
