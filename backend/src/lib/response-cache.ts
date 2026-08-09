// Tiny in-memory TTL cache for GET /products and GET /packs. The database lives behind
// Railway's public proxy rather than private networking (they're in different projects),
// so every query pays a public-internet round trip - each was consistently costing
// 300-700ms even for a handful of rows. Both endpoints are invalidated immediately on
// any write, so the TTL is just a safety net, not the main freshness mechanism.
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}
