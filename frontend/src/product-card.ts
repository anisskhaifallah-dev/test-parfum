import type { Product, Gender, Pack } from './data/products';
import { getProductById } from './data/products';
import { isWishlisted, toggleWishlist } from './wishlist';
import { t } from './i18n';
import { escapeHtml } from './escape-html';

export function genderLabel(g: Gender): string {
  return g === 'her' ? t('nav.forHer') : t('nav.forHim');
}

function familyLabel(family: string): string {
  return t(`family.${family}`);
}

export function heartIcon(active: boolean): string {
  return `<svg viewBox="0 0 24 24" fill="${active ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
}

export function minPrice(p: Product): number {
  return Math.min(...p.sizes.map((s) => s.price));
}

export function renderCard(p: Product): string {
  return `
    <div class="shop-card ${p.available ? '' : 'shop-card-unavailable'}">
      <a href="product.html?id=${p.id}">
        <div class="shop-card-image-wrap">
          <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" width="390" height="520" />
          ${p.available ? '' : `<span class="shop-card-badge">${t('product.unavailableBadge')}</span>`}
        </div>
      </a>
      <button class="shop-card-wishlist ${isWishlisted(p.id) ? 'active' : ''}" data-id="${p.id}" aria-label="${t('product.toggleWishlist')}">${heartIcon(isWishlisted(p.id))}</button>
      <a href="product.html?id=${p.id}" style="text-decoration:none;color:inherit;">
        <div class="shop-card-body">
          <span class="shop-card-family">${familyLabel(p.family)} &middot; ${genderLabel(p.gender)}</span>
          <p class="shop-card-name">${escapeHtml(p.name)}</p>
          <span class="shop-card-price">${t('product.from')} ${minPrice(p)} DH</span>
        </div>
      </a>
    </div>
  `;
}

export function renderPackCard(pack: Pack): string {
  const includedNames = pack.productIds
    .map((id) => getProductById(id)?.name)
    .filter(Boolean)
    .map((name) => escapeHtml(name))
    .join(' + ');
  return `
    <div class="shop-card pack-card">
      <div class="shop-card-image-wrap"><img src="${pack.image}" alt="${escapeHtml(pack.name)}" loading="lazy" width="390" height="520" /></div>
      <div class="shop-card-body">
        <span class="shop-card-family">${pack.productIds.length} &times; ${pack.decantMl}ml decants</span>
        <p class="shop-card-name">${escapeHtml(pack.name)}</p>
        <p class="text-700 fs--1 mb-2">${includedNames}</p>
        <span class="shop-card-price">${pack.price} DH <span class="text-600 text-decoration-line-through fs--1">${pack.compareAtPrice} DH</span></span>
        <button type="button" class="btn btn-dark w-100 mt-3" data-add-pack="${pack.id}">${t('product.addPackToCart')}</button>
      </div>
    </div>
  `;
}

export function wireWishlistButtons(container: ParentNode): void {
  container.querySelectorAll<HTMLButtonElement>('.shop-card-wishlist').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.id as string;
      const active = toggleWishlist(id);
      btn.classList.toggle('active', active);
      btn.innerHTML = heartIcon(active);
    });
  });
}
