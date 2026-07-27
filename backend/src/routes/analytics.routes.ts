import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

const DAY_MS = 24 * 60 * 60 * 1000;
const ALL_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

function parseDateRange(query: { from?: string; to?: string }): { from: Date; to: Date } {
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date();
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(to.getTime() - 29 * DAY_MS);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new HttpError(400, 'Invalid from/to date');
  if (from > to) throw new HttpError(400, '"from" must be before "to"');
  return { from, to };
}

type Granularity = 'day' | 'week' | 'month';

// Monday-anchored for 'week' so a period reads as a consistent calendar week either way.
function bucketKey(date: Date, granularity: Granularity): string {
  if (granularity === 'month') return date.toISOString().slice(0, 7);
  if (granularity === 'week') {
    const d = new Date(date);
    const dayIndex = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayIndex);
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

// GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD - everything the staff dashboard needs
// for one date range, aggregated server-side from Orders/OrderItems so the frontend just renders.
analyticsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { from, to } = parseDateRange(req.query as { from?: string; to?: string });

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { items: { include: { product: true } } },
    });

    const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
    const totalRevenue = nonCancelled.reduce((sum, o) => sum + o.subtotal, 0);
    const cancelledCount = orders.length - nonCancelled.length;

    const statusCounts = new Map<string, number>(ALL_STATUSES.map((s) => [s, 0]));
    orders.forEach((o) => statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1));

    const rangeDays = (to.getTime() - from.getTime()) / DAY_MS;
    const granularity: Granularity = rangeDays <= 62 ? 'day' : rangeDays <= 365 ? 'week' : 'month';

    const revenueBuckets = new Map<string, { revenue: number; orders: number }>();
    nonCancelled.forEach((o) => {
      const key = bucketKey(o.createdAt, granularity);
      const entry = revenueBuckets.get(key) ?? { revenue: 0, orders: 0 };
      entry.revenue += o.subtotal;
      entry.orders += 1;
      revenueBuckets.set(key, entry);
    });

    // Fill every bucket in the range (even zero-order ones) so the trend line has no gaps.
    const revenueOverTime: { date: string; revenue: number; orders: number }[] = [];
    let cursor = new Date(from);
    while (cursor <= to) {
      const key = bucketKey(cursor, granularity);
      const entry = revenueBuckets.get(key) ?? { revenue: 0, orders: 0 };
      revenueOverTime.push({ date: key, revenue: entry.revenue, orders: entry.orders });
      if (granularity === 'month') {
        cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      } else if (granularity === 'week') {
        cursor = new Date(cursor.getTime() + 7 * DAY_MS);
      } else {
        cursor = new Date(cursor.getTime() + DAY_MS);
      }
    }

    const sellerTotals = new Map<string, { id: string; name: string; kind: 'product' | 'pack'; qty: number; revenue: number }>();
    const genderTotals = new Map<string, { qty: number; revenue: number }>();
    const familyTotals = new Map<string, { qty: number; revenue: number }>();
    const sizeTotals = new Map<string, { ml: number; label: string; qty: number; revenue: number }>();

    nonCancelled.forEach((o) => {
      o.items.forEach((item) => {
        const sellerId = (item.productId ?? item.packId) as string;
        const sellerKey = `${item.kind}:${sellerId}`;
        const sellerEntry = sellerTotals.get(sellerKey) ?? {
          id: sellerId,
          name: item.nameSnapshot,
          kind: item.kind as 'product' | 'pack',
          qty: 0,
          revenue: 0,
        };
        sellerEntry.qty += item.qty;
        sellerEntry.revenue += item.unitPrice * item.qty;
        sellerTotals.set(sellerKey, sellerEntry);

        if (item.kind === 'product' && item.product) {
          const g = genderTotals.get(item.product.gender) ?? { qty: 0, revenue: 0 };
          g.qty += item.qty;
          g.revenue += item.unitPrice * item.qty;
          genderTotals.set(item.product.gender, g);

          const f = familyTotals.get(item.product.family) ?? { qty: 0, revenue: 0 };
          f.qty += item.qty;
          f.revenue += item.unitPrice * item.qty;
          familyTotals.set(item.product.family, f);

          const ml = item.ml ?? 0;
          const sizeLabel = ml === 0 ? 'Full Bottle' : `${ml}ml`;
          const s = sizeTotals.get(sizeLabel) ?? { ml, label: sizeLabel, qty: 0, revenue: 0 };
          s.qty += item.qty;
          s.revenue += item.unitPrice * item.qty;
          sizeTotals.set(sizeLabel, s);
        }
      });
    });

    const topSellers = [...sellerTotals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    const salesBySize = [...sizeTotals.values()].sort((a, b) => (a.ml === 0 ? 1 : b.ml === 0 ? -1 : a.ml - b.ml));

    res.json({
      range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), granularity },
      totals: {
        revenue: totalRevenue,
        orders: orders.length,
        avgOrderValue: nonCancelled.length ? Math.round(totalRevenue / nonCancelled.length) : 0,
        cancelledCount,
        cancelledRate: orders.length ? Math.round((cancelledCount / orders.length) * 1000) / 10 : 0,
      },
      ordersByStatus: ALL_STATUSES.map((status) => ({ status, count: statusCounts.get(status) ?? 0 })),
      revenueOverTime,
      topSellers,
      salesByGender: [...genderTotals.entries()].map(([gender, v]) => ({ gender, ...v })),
      salesByFamily: [...familyTotals.entries()].map(([family, v]) => ({ family, ...v })),
      salesBySize,
    });
  })
);
