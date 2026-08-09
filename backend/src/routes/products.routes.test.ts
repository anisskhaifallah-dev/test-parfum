process.env.JWT_SECRET ??= 'test-secret-for-products-route';

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const PRODUCT_ROW = {
  id: 'p1',
  name: 'Test Fragrance',
  gender: 'her',
  family: 'Floral',
  image: 'img.webp',
  blurb: 'A test fragrance.',
  available: true,
  sortOrder: 0,
  featured: false,
  sizes: [{ ml: 0, label: 'Full Bottle', price: 100 }],
};

const PACK_ROW = {
  id: 'pack1',
  name: 'Test Pack',
  decantMl: 10,
  price: 50,
  compareAtPrice: 60,
  blurb: 'A test pack.',
  image: 'pack.webp',
  showOnHomepage: true,
  available: true,
  products: [{ productId: 'p1', product: PRODUCT_ROW }],
};

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    product: {
      findMany: vi.fn().mockResolvedValue([PRODUCT_ROW]),
      findUnique: vi.fn().mockResolvedValue(PRODUCT_ROW),
      findFirst: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(1),
    },
    pack: {
      findMany: vi.fn().mockResolvedValue([PACK_ROW]),
      findUnique: vi.fn().mockResolvedValue(PACK_ROW),
      delete: vi.fn().mockResolvedValue({}),
    },
    packProduct: {
      findFirst: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    orderItem: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn((fn: unknown) => (typeof fn === 'function' ? fn({}) : Promise.all(fn as Promise<unknown>[]))),
  },
}));

const { prisma } = await import('../lib/prisma.js');
const { productsRouter, packsRouter } = await import('./products.routes.js');
const { errorHandler } = await import('../middleware/error.js');
const { invalidateCache } = await import('../lib/response-cache.js');
const { signToken } = await import('../lib/jwt.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/products', productsRouter);
  app.use('/packs', packsRouter);
  app.use(errorHandler);
  return app;
}

describe('GET /products and /packs caching', () => {
  const token = signToken({ userId: 'staff-1' });

  beforeEach(() => {
    invalidateCache('products:all');
    invalidateCache('packs:all');
    vi.clearAllMocks();
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([PRODUCT_ROW]);
    (prisma.pack.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([PACK_ROW]);
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(PRODUCT_ROW);
    (prisma.pack.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(PACK_ROW);
    (prisma.product.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.packProduct.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.orderItem.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('only queries the database once across repeated GET /products calls', async () => {
    const app = buildApp();
    const first = await request(app).get('/products');
    const second = await request(app).get('/products');

    expect(first.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
  });

  it('only queries the database once across repeated GET /packs calls', async () => {
    const app = buildApp();
    await request(app).get('/packs');
    await request(app).get('/packs');

    expect(prisma.pack.findMany).toHaveBeenCalledTimes(1);
  });

  it('re-queries products after a DELETE invalidates the cache', async () => {
    const app = buildApp();
    await request(app).get('/products');
    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);

    const del = await request(app).delete('/products/p1').set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    await request(app).get('/products');
    expect(prisma.product.findMany).toHaveBeenCalledTimes(2);
  });

  it('re-queries packs after a DELETE invalidates the cache', async () => {
    const app = buildApp();
    await request(app).get('/packs');
    expect(prisma.pack.findMany).toHaveBeenCalledTimes(1);

    const del = await request(app).delete('/packs/pack1').set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    await request(app).get('/packs');
    expect(prisma.pack.findMany).toHaveBeenCalledTimes(2);
  });

  it('deleting a pack does not invalidate the unrelated products cache', async () => {
    const app = buildApp();
    await request(app).get('/products');
    await request(app).delete('/packs/pack1').set('Authorization', `Bearer ${token}`);
    await request(app).get('/products');

    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
  });
});
