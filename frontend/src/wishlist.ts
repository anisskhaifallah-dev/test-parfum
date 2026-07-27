const STORAGE_KEY = 'yy-parfums-wishlist';

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent('wishlist:updated'));
}

export function getWishlist(): string[] {
  return read();
}

export function isWishlisted(productId: string): boolean {
  return read().includes(productId);
}

/** Returns the new wishlisted state (true = now wishlisted). */
export function toggleWishlist(productId: string): boolean {
  const ids = read();
  const idx = ids.indexOf(productId);
  if (idx >= 0) {
    ids.splice(idx, 1);
    write(ids);
    return false;
  }
  ids.push(productId);
  write(ids);
  return true;
}

export function removeFromWishlist(productId: string) {
  write(read().filter((id) => id !== productId));
}
