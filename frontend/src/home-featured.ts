import { getByGender, type Gender, type Product } from './data/products';
import { minPrice } from './product-card';

function renderFeaturedCard(p: Product): string {
  return `
    <div class="col-md-6">
      <div class="card card-span h-100 text-white">
        <img class="card-img h-100" src="${p.image}" width="522" height="521" loading="lazy" decoding="async" alt="${p.name}" />
        <div class="card-img-overlay bg-dark-gradient d-flex flex-column-reverse">
          <h6 class="text-primary">From ${minPrice(p)} DH</h6>
          <p class="text-400 fs-1">${p.family} &middot; Eau de Parfum</p>
          <h4 class="text-light">${p.name}</h4>
        </div>
        <a class="stretched-link" href="product.html?id=${p.id}"></a>
      </div>
    </div>
  `;
}

// The homepage teaser just shows the top 2 (by sortOrder) products of each gender -
// the same order staff control from the dashboard drives both this and the category pages.
function renderTeaser(gender: Gender, containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = getByGender(gender).slice(0, 2).map(renderFeaturedCard).join('');
}

export function initHomeFeatured(): void {
  renderTeaser('her', 'for-her-teaser');
  renderTeaser('him', 'for-him-teaser');
}
