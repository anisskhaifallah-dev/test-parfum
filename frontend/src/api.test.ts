import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('API_BASE', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is relative in production builds when VITE_API_URL is not set', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_URL', undefined);
    const { API_BASE } = await import('./api.js');
    expect(API_BASE).toBe('/api');
  });

  it('falls back to localhost in dev when VITE_API_URL is not set', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_API_URL', undefined);
    const { API_BASE } = await import('./api.js');
    expect(API_BASE).toBe('http://localhost:4000/api');
  });

  it('always prefers an explicit VITE_API_URL when one is set', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_URL', 'https://example.com/api');
    const { API_BASE } = await import('./api.js');
    expect(API_BASE).toBe('https://example.com/api');
  });
});
