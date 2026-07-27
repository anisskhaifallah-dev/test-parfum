import { PrismaClient } from '@prisma/client';

// Dev/demo utility only - fills the store with realistic-looking fake orders so the
// staff dashboard (Commands queue + analytics charts) has something to show. Never run
// this against a real production database.
const prisma = new PrismaClient();

const FIRST_NAMES_F = ['Yasmine', 'Salma', 'Imane', 'Meryem', 'Hiba', 'Rania', 'Nour', 'Ghita', 'Sara', 'Fatima Zahra', 'Douae', 'Chaimae'];
const FIRST_NAMES_M = ['Youssef', 'Amine', 'Adam', 'Rayan', 'Omar', 'Anas', 'Zakaria', 'Karim', 'Ayoub', 'Hamza', 'Mehdi', 'Ismail'];
const LAST_NAMES = ['Alaoui', 'Bennani', 'El Idrissi', 'Fassi', 'Tazi', 'Chraibi', 'Berrada', 'Lahlou', 'El Amrani', 'Benjelloun', 'Ouazzani', 'Squalli'];
const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier', 'Agadir', 'Meknes', 'Oujda', 'Kenitra', 'Tetouan', 'Safi', 'El Jadida'];
const STREETS = ['Rue Hassan II', 'Avenue Mohammed V', 'Rue des Fleurs', 'Boulevard Al Massira', 'Rue Anfa', 'Avenue Ibn Battouta', 'Rue Zerktouni'];
const NOTES_POOL: (string | null)[] = [
  null, null, null, null,
  'Please call before delivery',
  "Leave with the concierge if I'm not home",
  "Gift wrap please, it's a birthday present",
  'Deliver after 6pm',
  'Ring the bell twice',
  'Second floor, no elevator',
];
const STATUS_WEIGHTS: [string, number][] = [
  ['pending', 5],
  ['confirmed', 6],
  ['shipped', 5],
  ['delivered', 7],
  ['cancelled', 1],
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted(weighted: [string, number][]): string {
  const total = weighted.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [value, weight] of weighted) {
    if (r < weight) return value;
    r -= weight;
  }
  return weighted[0][0];
}

function randomPhone(): string {
  return `+212 6${Math.floor(10000000 + Math.random() * 89999999)}`;
}

// Recency-biased: more fake orders in the recent past than 2-3 months ago, so the
// revenue-over-time chart reads like an active, growing store rather than flat noise.
function randomCreatedAt(maxDaysAgo: number): Date {
  const daysAgo = Math.floor(Math.random() * Math.random() * maxDaysAgo);
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

const ORDER_COUNT = 60;
const MAX_DAYS_AGO = 90;

async function main() {
  const products = await prisma.product.findMany({ include: { sizes: true } });
  const packs = await prisma.pack.findMany();

  if (products.length === 0) {
    console.error('No products found - run `npm run seed` first to load the catalog.');
    process.exit(1);
  }

  for (let i = 0; i < ORDER_COUNT; i++) {
    const isFemale = Math.random() < 0.55;
    const fullName = `${pick(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M)} ${pick(LAST_NAMES)}`;
    const itemCount = 1 + Math.floor(Math.random() * 2);
    const items: {
      kind: string;
      productId?: string;
      packId?: string;
      nameSnapshot: string;
      ml: number | null;
      qty: number;
      unitPrice: number;
    }[] = [];

    for (let j = 0; j < itemCount; j++) {
      const wantsPack = packs.length > 0 && Math.random() < 0.3;
      if (wantsPack) {
        const pack = pick(packs);
        items.push({ kind: 'pack', packId: pack.id, nameSnapshot: pack.name, ml: null, qty: 1, unitPrice: pack.price });
      } else {
        const product = pick(products);
        if (product.sizes.length === 0) continue;
        const size = pick(product.sizes);
        items.push({
          kind: 'product',
          productId: product.id,
          nameSnapshot: product.name,
          ml: size.ml,
          qty: 1 + (Math.random() < 0.2 ? 1 : 0),
          unitPrice: size.price,
        });
      }
    }
    if (items.length === 0) continue;

    const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);

    await prisma.order.create({
      data: {
        status: pickWeighted(STATUS_WEIGHTS),
        fullName,
        phone: randomPhone(),
        line1: `${10 + Math.floor(Math.random() * 200)} ${pick(STREETS)}`,
        city: pick(CITIES),
        country: 'Morocco',
        notes: pick(NOTES_POOL),
        subtotal,
        createdAt: randomCreatedAt(MAX_DAYS_AGO),
        items: { create: items },
      },
    });
  }

  console.log(`Seeded ${ORDER_COUNT} fake orders spread over the last ${MAX_DAYS_AGO} days.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
