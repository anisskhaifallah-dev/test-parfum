import { getAllPacks } from './data/products';
import { renderPackCard } from './product-card';
import { wirePackButtons } from './pack-buttons';

export function initPacksPage(): void {
  const grid = document.getElementById('shop-grid') as HTMLElement;
  const count = document.getElementById('shop-count') as HTMLElement;
  const packs = getAllPacks();

  count.textContent = `${packs.length} pack${packs.length === 1 ? '' : 's'}`;
  grid.innerHTML = packs.map(renderPackCard).join('');
  wirePackButtons(grid);
}
