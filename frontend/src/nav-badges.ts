import { getCartCount } from './cart';
import { getWishlist } from './wishlist';

function updateBadges() {
  const count = getCartCount();
  document.querySelectorAll<HTMLElement>('[data-cart-count]').forEach((el) => {
    el.textContent = String(count);
    el.classList.toggle('d-none', count === 0);
  });

  const wishCount = getWishlist().length;
  document.querySelectorAll<HTMLElement>('[data-wishlist-count]').forEach((el) => {
    el.textContent = String(wishCount);
    el.classList.toggle('d-none', wishCount === 0);
  });
}

export function initNavBadges() {
  updateBadges();
  window.addEventListener('cart:updated', updateBadges);
  window.addEventListener('wishlist:updated', updateBadges);
  window.addEventListener('storage', updateBadges);
}
