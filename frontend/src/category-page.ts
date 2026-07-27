import { getByGender, type Gender } from './data/products';
import { renderCard, wireWishlistButtons } from './product-card';

export function initCategoryPage(gender: Gender): void {
  const grid = document.getElementById('shop-grid') as HTMLElement;
  const count = document.getElementById('shop-count') as HTMLElement;
  const products = getByGender(gender);

  count.textContent = `${products.length} fragrance${products.length === 1 ? '' : 's'}`;
  grid.innerHTML = products.map(renderCard).join('');
  wireWishlistButtons(grid);
}
