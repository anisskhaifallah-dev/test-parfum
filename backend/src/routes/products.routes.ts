import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { slugify } from '../lib/slug.js';

const GENDERS = ['her', 'him'];
const FAMILIES = ['Floral', 'Woody', 'Oriental', 'Fresh', 'Gourmand', 'Citrus'];

export const productsRouter = Router();

interface SizeInput {
  ml?: number;
  price?: number;
  label?: string;
}

interface SizeDTO {
  ml: number;
  label: string;
  price: number;
}

function sortSizes(sizes: SizeDTO[]): SizeDTO[] {
  // Full Bottle (ml === 0) always sorts last - everything else ascending by volume.
  return [...sizes].sort((a, b) => (a.ml === 0 ? 1 : b.ml === 0 ? -1 : a.ml - b.ml));
}

function toProductDTO(p: {
  id: string;
  name: string;
  gender: string;
  family: string;
  image: string;
  blurb: string;
  available: boolean;
  sortOrder: number;
  featured: boolean;
  sizes: SizeDTO[];
}) {
  return {
    id: p.id,
    name: p.name,
    gender: p.gender,
    family: p.family,
    image: p.image,
    blurb: p.blurb,
    available: p.available,
    sortOrder: p.sortOrder,
    featured: p.featured,
    sizes: sortSizes(p.sizes),
  };
}

// Validates and normalizes a raw sizes array from the request body. Throws HttpError on
// anything invalid; auto-labels a size ("10ml Decant" / "Full Bottle") when none is given,
// so staff only has to type a label for something unusual.
function parseSizes(raw: unknown): SizeDTO[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, 'At least one size is required');

  const seen = new Set<number>();
  return raw.map((entry: SizeInput) => {
    const ml = entry?.ml;
    const price = entry?.price;
    if (ml == null || !Number.isInteger(ml) || ml < 0) throw new HttpError(400, 'Each size needs a whole-number ml (0 = Full Bottle)');
    if (price == null || typeof price !== 'number' || price <= 0) throw new HttpError(400, 'Each size needs a price greater than 0');
    if (seen.has(ml)) throw new HttpError(400, `Duplicate size: ${ml}ml`);
    seen.add(ml);

    const label = entry.label?.trim() || (ml === 0 ? 'Full Bottle' : `${ml}ml Decant`);
    return { ml, price, label };
  });
}

productsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { sizes: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json(products.map(toProductDTO));
  })
);

productsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: { sizes: true } });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(toProductDTO(product));
  })
);

// Everything below is staff-only - the storefront only ever calls the two GETs above.
productsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, gender, family, image, blurb, sizes, available, sortOrder, featured } = req.body as {
      name?: string;
      gender?: string;
      family?: string;
      image?: string;
      blurb?: string;
      sizes?: unknown;
      available?: boolean;
      sortOrder?: number;
      featured?: boolean;
    };

    if (!name) throw new HttpError(400, 'name is required');
    if (!gender || !GENDERS.includes(gender)) throw new HttpError(400, `gender must be one of: ${GENDERS.join(', ')}`);
    if (!family || !FAMILIES.includes(family)) throw new HttpError(400, `family must be one of: ${FAMILIES.join(', ')}`);
    if (!image) throw new HttpError(400, 'image is required');
    if (!blurb) throw new HttpError(400, 'blurb is required');
    const parsedSizes = parseSizes(sizes);

    const base = slugify(name);
    if (!base) throw new HttpError(400, 'name must contain at least one letter or number');
    let id = base;
    let suffix = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await prisma.product.findUnique({ where: { id } })) {
      suffix += 1;
      id = `${base}-${suffix}`;
    }

    // New products go to the end of the list by default, not the front.
    let resolvedSortOrder = sortOrder;
    if (resolvedSortOrder == null) {
      const last = await prisma.product.findFirst({ orderBy: { sortOrder: 'desc' } });
      resolvedSortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const product = await prisma.product.create({
      data: {
        id,
        name,
        gender,
        family,
        image,
        blurb,
        available: available ?? true,
        sortOrder: resolvedSortOrder,
        featured: featured ?? false,
        sizes: { create: parsedSizes },
      },
      include: { sizes: true },
    });
    res.status(201).json(toProductDTO(product));
  })
);

productsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Product not found');

    const { name, gender, family, image, blurb, sizes, available, sortOrder, featured } = req.body as {
      name?: string;
      gender?: string;
      family?: string;
      image?: string;
      blurb?: string;
      sizes?: unknown;
      available?: boolean;
      sortOrder?: number;
      featured?: boolean;
    };
    if (gender !== undefined && !GENDERS.includes(gender)) {
      throw new HttpError(400, `gender must be one of: ${GENDERS.join(', ')}`);
    }
    if (family !== undefined && !FAMILIES.includes(family)) {
      throw new HttpError(400, `family must be one of: ${FAMILIES.join(', ')}`);
    }
    const parsedSizes = sizes !== undefined ? parseSizes(sizes) : undefined;

    const product = await prisma.$transaction(async (tx) => {
      if (parsedSizes) {
        await tx.productSize.deleteMany({ where: { productId: req.params.id } });
      }
      return tx.product.update({
        where: { id: req.params.id },
        data: {
          name,
          gender,
          family,
          image,
          blurb,
          available,
          sortOrder,
          featured,
          ...(parsedSizes ? { sizes: { create: parsedSizes } } : {}),
        },
        include: { sizes: true },
      });
    });
    res.json(toProductDTO(product));
  })
);

productsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Product not found');

    const usedInPack = await prisma.packProduct.findFirst({ where: { productId: req.params.id } });
    if (usedInPack) throw new HttpError(409, 'Cannot delete: this product is part of a pack. Remove it from the pack first.');

    const usedInOrder = await prisma.orderItem.findFirst({ where: { productId: req.params.id } });
    if (usedInOrder) throw new HttpError(409, 'Cannot delete: this product appears in past orders.');

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export const packsRouter = Router();

function toPackDTO(pack: {
  id: string;
  name: string;
  products: { productId: string }[];
  decantMl: number;
  price: number;
  compareAtPrice: number;
  blurb: string;
  image: string;
  showOnHomepage: boolean;
}) {
  return {
    id: pack.id,
    name: pack.name,
    productIds: pack.products.map((link) => link.productId),
    decantMl: pack.decantMl,
    price: pack.price,
    compareAtPrice: pack.compareAtPrice,
    blurb: pack.blurb,
    image: pack.image,
    showOnHomepage: pack.showOnHomepage,
  };
}

// Throws if any id isn't a real product, or the list is empty/malformed.
async function validateProductIds(productIds: unknown): Promise<string[]> {
  if (!Array.isArray(productIds) || productIds.length === 0 || productIds.some((id) => typeof id !== 'string')) {
    throw new HttpError(400, 'productIds must be a non-empty array of strings');
  }
  const uniqueProductIds = [...new Set(productIds)];
  const foundCount = await prisma.product.count({ where: { id: { in: uniqueProductIds } } });
  if (foundCount !== uniqueProductIds.length) throw new HttpError(400, 'One or more productIds do not exist');
  return uniqueProductIds;
}

packsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const packs = await prisma.pack.findMany({ include: { products: { include: { product: true } } } });
    res.json(packs.map(toPackDTO));
  })
);

// Everything below is staff-only - the storefront only ever calls the GET above.
packsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, decantMl, price, compareAtPrice, blurb, image, productIds, showOnHomepage } = req.body as {
      name?: string;
      decantMl?: number;
      price?: number;
      compareAtPrice?: number;
      blurb?: string;
      image?: string;
      productIds?: unknown;
      showOnHomepage?: boolean;
    };

    if (!name) throw new HttpError(400, 'name is required');
    if (typeof decantMl !== 'number' || !Number.isInteger(decantMl) || decantMl <= 0) {
      throw new HttpError(400, 'decantMl must be a whole number greater than 0');
    }
    if (typeof price !== 'number' || price <= 0) throw new HttpError(400, 'price must be greater than 0');
    if (typeof compareAtPrice !== 'number' || compareAtPrice <= 0) throw new HttpError(400, 'compareAtPrice must be greater than 0');
    if (!blurb) throw new HttpError(400, 'blurb is required');
    if (!image) throw new HttpError(400, 'image is required');
    const uniqueProductIds = await validateProductIds(productIds);

    const base = slugify(name);
    if (!base) throw new HttpError(400, 'name must contain at least one letter or number');
    let id = base;
    let suffix = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await prisma.pack.findUnique({ where: { id } })) {
      suffix += 1;
      id = `${base}-${suffix}`;
    }

    const pack = await prisma.$transaction(async (tx) => {
      await tx.pack.create({
        data: { id, name, decantMl, price, compareAtPrice, blurb, image, showOnHomepage: showOnHomepage ?? true },
      });
      await tx.packProduct.createMany({ data: uniqueProductIds.map((productId) => ({ packId: id, productId })) });
      return tx.pack.findUniqueOrThrow({ where: { id }, include: { products: { include: { product: true } } } });
    });

    res.status(201).json(toPackDTO(pack));
  })
);

packsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.pack.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Pack not found');

    const { name, decantMl, price, compareAtPrice, blurb, image, productIds, showOnHomepage } = req.body as {
      name?: string;
      decantMl?: number;
      price?: number;
      compareAtPrice?: number;
      blurb?: string;
      image?: string;
      productIds?: unknown;
      showOnHomepage?: boolean;
    };
    if (decantMl !== undefined && (!Number.isInteger(decantMl) || decantMl <= 0)) {
      throw new HttpError(400, 'decantMl must be a whole number greater than 0');
    }
    if (price !== undefined && (typeof price !== 'number' || price <= 0)) throw new HttpError(400, 'price must be greater than 0');
    if (compareAtPrice !== undefined && (typeof compareAtPrice !== 'number' || compareAtPrice <= 0)) {
      throw new HttpError(400, 'compareAtPrice must be greater than 0');
    }
    const uniqueProductIds = productIds !== undefined ? await validateProductIds(productIds) : undefined;

    const pack = await prisma.$transaction(async (tx) => {
      if (uniqueProductIds) {
        await tx.packProduct.deleteMany({ where: { packId: req.params.id } });
        await tx.packProduct.createMany({
          data: uniqueProductIds.map((productId) => ({ packId: req.params.id, productId })),
        });
      }
      await tx.pack.update({
        where: { id: req.params.id },
        data: { name, decantMl, price, compareAtPrice, blurb, image, showOnHomepage },
      });
      return tx.pack.findUniqueOrThrow({
        where: { id: req.params.id },
        include: { products: { include: { product: true } } },
      });
    });

    res.json(toPackDTO(pack));
  })
);

packsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.pack.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Pack not found');

    const usedInOrder = await prisma.orderItem.findFirst({ where: { packId: req.params.id } });
    if (usedInOrder) throw new HttpError(409, 'Cannot delete: this pack appears in past orders.');

    await prisma.packProduct.deleteMany({ where: { packId: req.params.id } });
    await prisma.pack.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);
