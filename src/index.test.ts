import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from './index.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean up test database or set up test data
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Categories API', () => {
  it('GET /categories returns an array of categories', async () => {
    const res = await app.request('/categories');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
  
  it('POST /category creates a new category', async () => {
    const payload = { title: 'Test Category' };
    const res = await app.request('/category', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe(payload.title);
    expect(data.slug).toBe('test-category');
  });
});

describe('Questions API', () => {
  it('GET /questions returns an array of questions', async () => {
    const res = await app.request('/questions');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
