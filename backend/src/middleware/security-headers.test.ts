import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { securityHeaders } from './security-headers.js';

function buildApp() {
  const app = express();
  app.use(securityHeaders);
  app.get('/ping', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('securityHeaders', () => {
  it('sets standard hardening headers and removes the X-Powered-By fingerprint', async () => {
    const res = await request(buildApp()).get('/ping');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows cross-origin image loads (the frontend domain embeds images served from this API)', async () => {
    const res = await request(buildApp()).get('/ping');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});
