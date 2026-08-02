import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { loginLimiter } from './rate-limit.js';

function buildApp() {
  const app = express();
  app.post('/login', loginLimiter, (_req, res) => res.json({ ok: true }));
  return app;
}

describe('loginLimiter', () => {
  it('allows requests under the limit through', async () => {
    const app = buildApp();
    const res = await request(app).post('/login');
    expect(res.status).toBe(200);
  });

  it('blocks further attempts once the limit is exceeded (brute-force protection)', async () => {
    const app = buildApp();
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/login');
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
