import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('jwt secret handling', () => {
  const ORIGINAL_SECRET = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = ORIGINAL_SECRET;
  });

  it('throws at import time instead of falling back to a default secret', async () => {
    delete process.env.JWT_SECRET;
    await expect(import('./jwt.js')).rejects.toThrow(/JWT_SECRET/);
  });

  it('signs and verifies a token when JWT_SECRET is set', async () => {
    process.env.JWT_SECRET = 'a-test-secret';
    const { signToken, verifyToken } = await import('./jwt.js');
    const token = signToken({ userId: 'staff-123' });
    expect(verifyToken(token).userId).toBe('staff-123');
  });

  it('rejects a token signed with a different secret (proves no shared default is in play)', async () => {
    process.env.JWT_SECRET = 'secret-a';
    const { signToken } = await import('./jwt.js');
    const token = signToken({ userId: 'staff-123' });

    vi.resetModules();
    process.env.JWT_SECRET = 'secret-b';
    const { verifyToken } = await import('./jwt.js');
    expect(() => verifyToken(token)).toThrow();
  });
});
