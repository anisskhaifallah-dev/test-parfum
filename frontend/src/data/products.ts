import { apiFetch } from '../api';

export type Gender = 'her' | 'him';
export type Family = 'Floral' | 'Woody' | 'Oriental' | 'Fresh' | 'Gourmand' | 'Citrus';

/** ml === 0 means "Full Bottle" (no fixed volume shown, priced as the flagship size). */
export interface ProductSize {
  ml: number;
  label: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  gender: Gender;
  family: Family;
  image: string;
  blurb: string;
  available: boolean;
  featured: boolean;
  sizes: ProductSize[];
}

export interface Pack {
  id: string;
  name: string;
  productIds: string[];
  decantMl: number;
  price: number;
  compareAtPrice: number;
  blurb: string;
  image: string;
  showOnHomepage: boolean;
}

export const NOTES_BY_FAMILY: Record<Family, { top: string[]; heart: string[]; base: string[] }> = {
  Floral: { top: ['Bergamot', 'Pink Pepper'], heart: ['Jasmine', 'Peony', 'Rose'], base: ['White Musk', 'Cedarwood'] },
  Woody: { top: ['Cardamom', 'Bergamot'], heart: ['Vetiver', 'Cedar'], base: ['Sandalwood', 'Amber', 'Oakmoss'] },
  Oriental: { top: ['Saffron', 'Mandarin'], heart: ['Amber', 'Incense'], base: ['Vanilla', 'Musk', 'Benzoin'] },
  Fresh: { top: ['Bergamot', 'Mint'], heart: ['Green Tea', 'Marine Notes'], base: ['White Musk', 'Driftwood'] },
  Gourmand: { top: ['Praline', 'Orange Blossom'], heart: ['Caramel', 'Honey'], base: ['Tonka Bean', 'Vanilla'] },
  Citrus: { top: ['Bergamot', 'Grapefruit', 'Mandarin'], heart: ['Neroli', 'Petitgrain'], base: ['Cedar', 'White Musk'] },
};

// Catalog now lives in the backend (/backend) so staff can manage it without a code
// change. This module fetches it once per page load and caches it in memory - call
// loadCatalog() before using any of the getters below.
let products: Product[] = [];
let packs: Pack[] = [];
let loaded = false;

export async function loadCatalog(): Promise<void> {
  if (loaded) return;
  try {
    const [productsResult, packsResult] = await Promise.all([
      apiFetch<Product[]>('/products'),
      apiFetch<Pack[]>('/packs'),
    ]);
    products = productsResult;
    packs = packsResult;
  } catch (err) {
    console.error('Failed to load catalog from the backend API', err);
    products = [];
    packs = [];
  }
  loaded = true;
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getPackById(id: string): Pack | undefined {
  return packs.find((p) => p.id === id);
}

export function getByGender(gender: Gender): Product[] {
  return products.filter((p) => p.gender === gender);
}

export function getOthers(product: Product): Product[] {
  return products.filter((p) => p.id !== product.id);
}

export function getAllPacks(): Pack[] {
  return packs;
}

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter(
    (p) => p.name.toLowerCase().includes(q) || p.family.toLowerCase().includes(q) || p.gender.includes(q)
  );
}
