import type { Pack } from './data/products';
import { getAllPacks, getProductById } from './data/products';
import { wirePackButtons } from './pack-buttons';

function renderHomePackCard(pack: Pack): string {
  const includedNames = pack.productIds.map((id) => getProductById(id)?.name).filter(Boolean).join(' + ');
  return `
    <div class="col-md-4">
      <div class="card h-100 text-center p-4">
        <img class="mx-auto mb-3" src="${pack.image}" width="140" height="140" style="object-fit:cover;border-radius:50%;" loading="lazy" decoding="async" alt="${pack.name}" />
        <h5 class="fw-bold">${pack.name}</h5>
        <p class="text-700 fs--1 mb-2">${includedNames}, ${pack.decantMl}ml each</p>
        <div class="fw-bold mb-3">${pack.price} DH <span class="text-600 text-decoration-line-through fs--1">${pack.compareAtPrice} DH</span></div>
        <button type="button" class="btn btn-dark w-100 mt-auto" data-add-pack="${pack.id}">Add Pack to Cart</button>
      </div>
    </div>
  `;
}

export function initHomePacks(): void {
  const container = document.getElementById('home-packs-grid');
  if (!container) return;
  container.innerHTML = getAllPacks().filter((p) => p.showOnHomepage).map(renderHomePackCard).join('');
  wirePackButtons(container);
}
