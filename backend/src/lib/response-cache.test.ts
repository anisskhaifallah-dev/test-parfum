import { describe, expect, it } from 'vitest';
import { getCached, invalidateCache, setCached } from './response-cache.js';

describe('response-cache', () => {
  it('returns undefined for a key that was never set', () => {
    expect(getCached('never-set')).toBeUndefined();
  });

  it('returns the cached value while the TTL has not elapsed', () => {
    setCached('fresh', { hello: 'world' }, 60_000);
    expect(getCached('fresh')).toEqual({ hello: 'world' });
  });

  it('returns undefined once the TTL has elapsed', async () => {
    setCached('expires-fast', 'value', 5);
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(getCached('expires-fast')).toBeUndefined();
  });

  it('returns undefined immediately after invalidation', () => {
    setCached('to-invalidate', 'value', 60_000);
    invalidateCache('to-invalidate');
    expect(getCached('to-invalidate')).toBeUndefined();
  });

  it('keeps keys independent of each other', () => {
    setCached('a', 1, 60_000);
    setCached('b', 2, 60_000);
    invalidateCache('a');
    expect(getCached('a')).toBeUndefined();
    expect(getCached('b')).toBe(2);
  });
});
