import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

// Mirrors frontend/src/data/products.ts - keep both in sync until the frontend
// is switched over to fetch this from the API instead of its local file.
const PRODUCTS = [
  {
    id: 'jasmin-blanc',
    name: 'Jasmin Blanc',
    gender: 'her',
    family: 'Floral',
    image: 'assets/img/gallery/hat.webp',
    blurb: 'A luminous floral bouquet with a soft, powdery finish.',
    priceFull: 85,
  },
  {
    id: 'ambre-precieux',
    name: 'Ambre Précieux',
    gender: 'her',
    family: 'Oriental',
    image: 'assets/img/gallery/vanity-bag.webp',
    blurb: 'A rich, resinous oriental built for cooler evenings.',
    priceFull: 120,
  },
  {
    id: 'oud-essentiel',
    name: 'Oud Essentiel',
    gender: 'him',
    family: 'Oriental',
    image: 'assets/img/gallery/wallet.webp',
    blurb: 'A rich, resinous oriental built for cooler evenings.',
    priceFull: 135,
  },
  {
    id: 'vetiver-noir',
    name: 'Vétiver Noir',
    gender: 'him',
    family: 'Woody',
    image: 'assets/img/gallery/wrist-watch.webp',
    blurb: 'A grounded woody composition, warm and quietly confident.',
    priceFull: 105,
  },
];

const PACKS = [
  {
    id: 'her-duo',
    name: 'Her Duo',
    productIds: ['jasmin-blanc', 'ambre-precieux'],
    decantMl: 10,
    price: 38,
    compareAtPrice: 45,
    blurb: 'Jasmin Blanc + Ambre Précieux, 10ml each — a floral and an oriental to compare side by side.',
    image: 'assets/img/gallery/hat.webp',
  },
  {
    id: 'his-duo',
    name: 'His Duo',
    productIds: ['oud-essentiel', 'vetiver-noir'],
    decantMl: 10,
    price: 46,
    compareAtPrice: 55,
    blurb: 'Oud Essentiel + Vétiver Noir, 10ml each — two takes on a woody-oriental signature.',
    image: 'assets/img/gallery/wallet.webp',
  },
  {
    id: 'discovery-trio',
    name: 'Discovery Trio',
    productIds: ['jasmin-blanc', 'oud-essentiel', 'vetiver-noir'],
    decantMl: 10,
    price: 60,
    compareAtPrice: 75,
    blurb: 'Three 10ml decants across the full lineup — the easiest way to find your signature scent.',
    image: 'assets/img/gallery/vanity-bag.webp',
  },
];

async function main() {
  for (const [index, p] of PRODUCTS.entries()) {
    const sizes = [
      { ml: 10, label: '10ml Decant', price: round5(p.priceFull * 0.22) },
      { ml: 20, label: '20ml Decant', price: round5(p.priceFull * 0.4) },
      { ml: 0, label: 'Full Bottle', price: p.priceFull },
    ];

    await prisma.product.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        name: p.name,
        gender: p.gender,
        family: p.family,
        image: p.image,
        blurb: p.blurb,
        sortOrder: index,
        sizes: { create: sizes },
      },
      update: {
        name: p.name,
        gender: p.gender,
        family: p.family,
        image: p.image,
        blurb: p.blurb,
        // sortOrder deliberately left out of the update branch - staff may have
        // already reordered products in the dashboard, re-seeding shouldn't reset that.
      },
    });

    // Re-seeding doesn't touch sizes on an already-existing product (staff may have
    // customized them) - only a brand-new product gets the default 10/20/Full trio.
  }

  for (const pack of PACKS) {
    await prisma.pack.upsert({
      where: { id: pack.id },
      create: {
        id: pack.id,
        name: pack.name,
        decantMl: pack.decantMl,
        price: pack.price,
        compareAtPrice: pack.compareAtPrice,
        blurb: pack.blurb,
        image: pack.image,
      },
      update: {
        name: pack.name,
        decantMl: pack.decantMl,
        price: pack.price,
        compareAtPrice: pack.compareAtPrice,
        blurb: pack.blurb,
        image: pack.image,
      },
    });

    await prisma.packProduct.deleteMany({ where: { packId: pack.id } });
    for (const productId of pack.productIds) {
      await prisma.packProduct.create({ data: { packId: pack.id, productId } });
    }
  }

  console.log(`Seeded ${PRODUCTS.length} products and ${PACKS.length} packs.`);

  // First admin account, so there's a way to log in at all. Change this password after
  // first login - it's only meant to get you into the (hidden) staff login the first time.
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@yyparfums.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'changeme123';
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        name: 'Admin',
        role: 'admin',
      },
    });
    console.log(`Created initial admin account: ${adminEmail} / ${adminPassword} (change this password)`);
  } else {
    console.log(`Admin account ${adminEmail} already exists, skipping.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
