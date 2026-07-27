import { getWishlist, removeFromWishlist } from './wishlist';
import { getProductById, type Product } from './data/products';
import { addToCart } from './cart';

function render() {
  const ids = getWishlist();
  const grid = document.getElementById('wishlist-grid') as HTMLElement;
  const empty = document.getElementById('wishlist-empty') as HTMLElement;

  const products = ids.map(getProductById).filter((p): p is Product => Boolean(p));

  if (products.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  grid.innerHTML = products
    .map(
      (p) => `
        <div class="shop-card">
          <a href="product.html?id=${p.id}">
            <div class="shop-card-image-wrap"><img src="${p.image}" alt="${p.name}" loading="lazy" width="390" height="520" /></div>
          </a>
          <div class="shop-card-body">
            <span class="shop-card-family">${p.family}</span>
            <p class="shop-card-name">${p.name}</p>
            <span class="shop-card-price">From ${Math.min(...p.sizes.map((s) => s.price))} DH</span>
            <div class="d-flex gap-2 mt-2">
              <button type="button" class="btn btn-sm btn-dark flex-grow-1" data-action="move" data-id="${p.id}">Add to Cart</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" data-action="remove" data-id="${p.id}">Remove</button>
            </div>
          </div>
        </div>
      `
    )
    .join('');

  grid.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id as string;
      if (btn.dataset.action === 'move') {
        const product = getProductById(id);
        if (product) addToCart(id, product.sizes[1]?.ml ?? product.sizes[0].ml, 1);
      } else {
        removeFromWishlist(id);
      }
      render();
    });
  });
}

export function initWishlistPage(): void {
  render();
}
