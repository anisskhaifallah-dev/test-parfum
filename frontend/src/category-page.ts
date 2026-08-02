import { getByGender, type Gender } from './data/products';
import { renderCard, wireWishlistButtons } from './product-card';
import { t } from './i18n';

export function initCategoryPage(gender: Gender): void {
  const grid = document.getElementById('shop-grid') as HTMLElement;
  const count = document.getElementById('shop-count') as HTMLElement;
  const products = getByGender(gender);

  count.textContent = t(products.length === 1 ? 'category.countOne' : 'category.countOther', { count: products.length });
  grid.innerHTML = products.map(renderCard).join('');
  wireWishlistButtons(grid);
}
