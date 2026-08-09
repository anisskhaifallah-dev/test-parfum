process.env.JWT_SECRET ??= 'test-secret-for-uploads-route';

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    image: {
      create: vi.fn().mockResolvedValue({ id: 'img-1' }),
    },
  },
}));

vi.mock('sharp', () => ({
  default: () => ({
    rotate: () => ({
      resize: () => ({
        webp: () => ({
          toBuffer: () => Promise.resolve(Buffer.from('fake-webp-bytes')),
        }),
      }),
    }),
  }),
}));

const { uploadsRouter } = await import('./uploads.routes.js');
const { errorHandler } = await import('../middleware/error.js');
const { signToken } = await import('../lib/jwt.js');

function buildApp(trustProxy: boolean) {
  const app = express();
  if (trustProxy) app.set('trust proxy', 1);
  app.use('/uploads', uploadsRouter);
  app.use(errorHandler);
  return app;
}

describe('POST /uploads', () => {
  const token = signToken({ userId: 'staff-1' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mints an https URL when behind a proxy that terminates TLS (trust proxy on)', async () => {
    const app = buildApp(true);
    const res = await request(app)
      .post('/uploads')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Forwarded-Proto', 'https')
      .attach('image', Buffer.from('fake-image-bytes'), 'photo.png');

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^https:\/\//);
  });

  it('would mint an http URL if trust proxy were left off, demonstrating the bug this guards against', async () => {
    const app = buildApp(false);
    const res = await request(app)
      .post('/uploads')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Forwarded-Proto', 'https')
      .attach('image', Buffer.from('fake-image-bytes'), 'photo.png');

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^http:\/\//);
  });
});
