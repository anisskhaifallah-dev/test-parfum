import { beforeEach, describe, expect, it, vi } from 'vitest';

const PACKS = [
  { id: 'available-pack', name: 'Available Pack', productIds: [], decantMl: 10, price: 30, compareAtPrice: 40, blurb: '', image: '', showOnHomepage: true, available: true },
  { id: 'retired-pack', name: 'Retired Pack', productIds: [], decantMl: 10, price: 30, compareAtPrice: 40, blurb: '', image: '', showOnHomepage: true, available: false },
];

vi.mock('../api', () => ({
  apiFetch: vi.fn((path: string) => {
    if (path === '/products') return Promise.resolve([]);
    if (path === '/packs') return Promise.resolve(PACKS);
    throw new Error(`Unhandled path in test: ${path}`);
  }),
}));

describe('getAllPacks / getPackById availability', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getAllPacks() excludes unavailable packs, but getPackById() still finds them', async () => {
    const { loadCatalog, getAllPacks, getPackById } = await import('./products');
    await loadCatalog();

    const all = getAllPacks();
    expect(all.map((p) => p.id)).toEqual(['available-pack']);

    // A pack already sitting in someone's cart should still resolve even if it's since
    // been retired - only the storefront *listings* hide it.
    expect(getPackById('retired-pack')?.name).toBe('Retired Pack');
  });
});
