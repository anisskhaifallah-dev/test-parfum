process.env.JWT_SECRET ??= 'test-secret-for-orders-route';

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    },
    orderItem: {
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    pack: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock('../lib/notify.js', () => ({
  sendNewOrderNotification: vi.fn(),
}));

const { prisma } = await import('../lib/prisma.js');
const { signToken } = await import('../lib/jwt.js');
const { ordersRouter } = await import('./orders.routes.js');
const { errorHandler } = await import('../middleware/error.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/orders', ordersRouter);
  app.use(errorHandler);
  return app;
}

describe('DELETE /orders/:id', () => {
  const token = signToken({ userId: 'staff-1' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    const res = await request(buildApp()).delete('/orders/order-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 if the order does not exist', async () => {
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await request(buildApp()).delete('/orders/nope').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('deletes order items then the order itself, and frees up anything that referenced it', async () => {
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'order-1' });
    const res = await request(buildApp()).delete('/orders/order-1').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(prisma.orderItem.deleteMany).toHaveBeenCalledWith({ where: { orderId: 'order-1' } });
    expect(prisma.order.delete).toHaveBeenCalledWith({ where: { id: 'order-1' } });
  });
});

describe('POST /orders - pack availability', () => {
  const validCustomer = {
    fullName: 'Test Customer',
    phone: '0600000000',
    line1: '1 Test St',
    city: 'Casablanca',
    country: 'Morocco',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an order containing a pack that is marked unavailable', async () => {
    (prisma.pack.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'retired-pack',
      name: 'Retired Pack',
      price: 100,
      available: false,
    });

    const res = await request(buildApp())
      .post('/orders')
      .send({ ...validCustomer, items: [{ kind: 'pack', packId: 'retired-pack', qty: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/currently unavailable/);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('accepts an order containing an available pack', async () => {
    (prisma.pack.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'her-duo',
      name: 'Her Duo',
      price: 100,
      available: true,
    });
    (prisma.order.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'order-2', items: [] });

    const res = await request(buildApp())
      .post('/orders')
      .send({ ...validCustomer, items: [{ kind: 'pack', packId: 'her-duo', qty: 1 }] });

    expect(res.status).toBe(201);
    expect(prisma.order.create).toHaveBeenCalled();
  });
});
