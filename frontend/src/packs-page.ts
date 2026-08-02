import { getAllPacks } from './data/products';
import { renderPackCard } from './product-card';
import { wirePackButtons } from './pack-buttons';
import { t } from './i18n';

export function initPacksPage(): void {
  const grid = document.getElementById('shop-grid') as HTMLElement;
  const count = document.getElementById('shop-count') as HTMLElement;
  const packs = getAllPacks();

  count.textContent = t(packs.length === 1 ? 'packs.countOne' : 'packs.countOther', { count: packs.length });
  grid.innerHTML = packs.map(renderPackCard).join('');
  wirePackButtons(grid);
}
