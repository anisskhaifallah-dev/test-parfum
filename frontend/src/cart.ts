import { getProductById, getPackById } from './data/products';

export interface ProductLine {
  kind: 'product';
  productId: string;
  ml: number;
  qty: number;
}

export interface PackLine {
  kind: 'pack';
  packId: string;
  qty: number;
}

export type CartLine = ProductLine | PackLine;

const STORAGE_KEY = 'yy-parfums-cart';

function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(lines: CartLine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent('cart:updated'));
}

export function getCart(): CartLine[] {
  return readCart();
}

export function addToCart(productId: string, ml: number, qty = 1) {
  const lines = readCart();
  const existing = lines.find(
    (l): l is ProductLine => l.kind === 'product' && l.productId === productId && l.ml === ml
  );
  if (existing) {
    existing.qty += qty;
  } else {
    lines.push({ kind: 'product', productId, ml, qty });
  }
  writeCart(lines);
}

export function addPackToCart(packId: string, qty = 1) {
  const lines = readCart();
  const existing = lines.find((l): l is PackLine => l.kind === 'pack' && l.packId === packId);
  if (existing) {
    existing.qty += qty;
  } else {
    lines.push({ kind: 'pack', packId, qty });
  }
  writeCart(lines);
}

export function updateCartQty(index: number, qty: number) {
  let lines = readCart();
  if (qty <= 0) {
    lines = lines.filter((_, i) => i !== index);
  } else if (lines[index]) {
    lines[index].qty = qty;
  }
  writeCart(lines);
}

export function removeCartLine(index: number) {
  writeCart(readCart().filter((_, i) => i !== index));
}

export function clearCart() {
  writeCart([]);
}

export function getCartCount(): number {
  return readCart().reduce((sum, l) => sum + l.qty, 0);
}

export function lineTotal(line: CartLine): number {
  if (line.kind === 'product') {
    const product = getProductById(line.productId);
    const size = product?.sizes.find((s) => s.ml === line.ml);
    return size ? size.price * line.qty : 0;
  }
  const pack = getPackById(line.packId);
  return pack ? pack.price * line.qty : 0;
}

export function getCartTotal(): number {
  return readCart().reduce((sum, line) => sum + lineTotal(line), 0);
}
