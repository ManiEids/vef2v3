// Simple placeholder test file using Node.js built-in test runner
import app from './index.js';

// Basic test to verify app exists
import { test } from 'node:test';
import assert from 'node:assert';

test('app should be defined', () => {
  assert.ok(app, 'App is defined');
});
