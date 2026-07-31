import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { unitPriceForMl } from '../lib/pricing.js';
import { sendNewOrderNotification } from '../lib/notify.js';

export const ordersRouter = Router();

const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

interface OrderItemInput {
  kind?: 'product' | 'pack';
  productId?: string;
  packId?: string;
  ml?: number;
  qty?: number;
}

// Public: a customer submits this form directly, no account needed. Customer service
// then reviews it (GET /orders below, staff-only) and confirms it by phone/DM before
// it ships - nothing here charges a card, payment is always Cash on Delivery.
ordersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { fullName, phone, line1, line2, city, country, notes, items } = req.body as {
      fullName?: string;
      phone?: string;
      line1?: string;
      line2?: string;
      city?: string;
      country?: string;
      notes?: string;
      items?: OrderItemInput[];
    };

    if (!fullName || !phone || !line1 || !city || !country) {
      throw new HttpError(400, 'fullName, phone, line1, city and country are required');
    }
    if (!items || items.length === 0) throw new HttpError(400, 'At least one item is required');

    const itemsData = await Promise.all(
      items.map(async (item) => {
        const qty = item.qty && item.qty > 0 ? item.qty : 1;

        if (item.kind === 'product') {
          if (!item.productId) throw new HttpError(400, 'productId is required for product lines');
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            include: { sizes: true },
          });
          if (!product) throw new HttpError(404, `Product not found: ${item.productId}`);
          if (!product.available) throw new HttpError(400, `${product.name} is currently unavailable`);
          const ml = item.ml ?? 0;
          const unitPrice = unitPriceForMl(product, ml);
          if (unitPrice === undefined) throw new HttpError(400, `${product.name} has no size at ${ml}ml`);
          return {
            kind: 'product',
            productId: product.id,
            nameSnapshot: product.name,
            ml,
            qty,
            unitPrice,
          };
        }
        if (item.kind === 'pack') {
          if (!item.packId) throw new HttpError(400, 'packId is required for pack lines');
          const pack = await prisma.pack.findUnique({ where: { id: item.packId } });
          if (!pack) throw new HttpError(404, `Pack not found: ${item.packId}`);
          return {
            kind: 'pack',
            packId: pack.id,
            nameSnapshot: pack.name,
            ml: null,
            qty,
            unitPrice: pack.price,
          };
        }
        throw new HttpError(400, "each item needs kind: 'product' or 'pack'");
      })
    );

    const subtotal = itemsData.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

    const order = await prisma.order.create({
      data: {
        fullName,
        phone,
        line1,
        line2,
        city,
        country,
        notes,
        subtotal,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    res.status(201).json(order);
    void sendNewOrderNotification(order);
  })
);

// Everything below is staff-only - this is how customer service finds and confirms orders.
ordersRouter.use(requireAuth);

ordersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = req.query as { status?: string };
    if (status && !VALID_STATUSES.includes(status)) throw new HttpError(400, 'Invalid status filter');

    const orders = await prisma.order.findMany({
      where: status ? { status } : undefined,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  })
);

ordersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Order not found');
    res.json(order);
  })
);

ordersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status?: string };
    if (!status || !VALID_STATUSES.includes(status)) {
      throw new HttpError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Order not found');

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { items: true },
    });
    res.json(order);
  })
);
