import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from './index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Ensure the database is clean before tests (optional, for isolation)
  await prisma.post.deleteMany();
});

afterAll(async () => {
  // Disconnect Prisma after tests to avoid open handles
  await prisma.$disconnect();
});

describe('POST /posts', () => {
  it('creates a new post', async () => {
    const payload = { title: 'Test Post', content: 'Testing content' };
    const res = await app.request('/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe(payload.title);
    expect(data.content).toBe(payload.content);
    expect(data.id).toBeDefined();
  });
});

describe('GET /posts', () => {
  it('returns an array of posts including the newly created post', async () => {
    const res = await app.request('/posts');
    expect(res.status).toBe(200);
    const posts = await res.json();
    expect(Array.isArray(posts)).toBe(true);
    // We should have at least one post (the one created above)
    expect(posts.length).toBeGreaterThan(0);
    // Verify the content of the first post
    expect(posts[0]).toHaveProperty('id');
    expect(posts[0]).toHaveProperty('title');
  });
});
