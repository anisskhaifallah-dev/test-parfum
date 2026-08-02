import { getProductById, getOthers, NOTES_BY_FAMILY } from './data/products';
import { renderCard, wireWishlistButtons, genderLabel, heartIcon } from './product-card';
import { addToCart } from './cart';
import { toggleWishlist, isWishlisted } from './wishlist';
import { t } from './i18n';
import { escapeHtml } from './escape-html';

export function initProductPage(): void {
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || '';
  const product = getProductById(id);
  const root = document.getElementById('pdp-root') as HTMLElement;
  const relatedSection = document.getElementById('related-section') as HTMLElement;

  if (!product) {
    root.innerHTML = `
      <div class="col-12 text-center py-8">
        <h2 class="fw-normal">${t('product.notFound')}</h2>
        <a class="btn btn-dark mt-3" href="index.html">${t('product.backToShop')}</a>
      </div>
    `;
    relatedSection.classList.add('d-none');
    return;
  }

  const notes = NOTES_BY_FAMILY[product.family];
  let selectedMl = product.sizes[1]?.ml ?? product.sizes[0].ml;
  const priceFor = (ml: number) => product.sizes.find((s) => s.ml === ml)!.price;

  root.innerHTML = `
    <div class="col-lg-6">
      <img class="pdp-image" src="${product.image}" alt="${escapeHtml(product.name)}" width="600" height="750" />
    </div>
    <div class="col-lg-6">
      <span class="shop-card-family">${t(`family.${product.family}`)} &middot; ${genderLabel(product.gender)}</span>
      <h1 class="fw-normal mt-2 mb-3">${escapeHtml(product.name)}</h1>
      <p class="text-700">${escapeHtml(product.blurb)}</p>
      <div class="notes-pyramid">
        <div class="notes-row"><span class="notes-label">${t('product.top')}</span><span class="notes-values">${notes.top.join(', ')}</span></div>
        <div class="notes-row"><span class="notes-label">${t('product.heart')}</span><span class="notes-values">${notes.heart.join(', ')}</span></div>
        <div class="notes-row"><span class="notes-label">${t('product.base')}</span><span class="notes-values">${notes.base.join(', ')}</span></div>
      </div>
      <div class="size-picker" id="size-picker">
        ${product.sizes.map((s) => `<button type="button" class="size-option ${s.ml === selectedMl ? 'active' : ''}" data-ml="${s.ml}">${escapeHtml(s.label)}</button>`).join('')}
      </div>
      <div class="fw-bold fs-3 mb-4" id="pdp-price">${priceFor(selectedMl)} DH</div>
      ${!product.available ? `<p class="text-danger fw-bold mb-2">${t('product.currentlyUnavailable')}</p>` : ''}
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-lg btn-dark flex-grow-1" id="add-to-cart" ${product.available ? '' : 'disabled'}>${product.available ? t('product.addToCart') : t('product.outOfStock')}</button>
        <button type="button" class="shop-card-wishlist ${isWishlisted(product.id) ? 'active' : ''}" style="position:static;width:52px;height:52px;flex-shrink:0;" id="pdp-wishlist" aria-label="${t('product.toggleWishlist')}">${heartIcon(isWishlisted(product.id))}</button>
      </div>
      <div id="add-confirm" class="text-success mt-2 fs--1 d-none">${t('product.addedToCart')}</div>
    </div>
  `;

  document.getElementById('size-picker')!.querySelectorAll<HTMLButtonElement>('.size-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedMl = Number(btn.dataset.ml);
      document.querySelectorAll('#size-picker .size-option').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      (document.getElementById('pdp-price') as HTMLElement).textContent = `${priceFor(selectedMl)} DH`;
    });
  });

  document.getElementById('add-to-cart')!.addEventListener('click', () => {
    addToCart(product.id, selectedMl, 1);
    const confirm = document.getElementById('add-confirm') as HTMLElement;
    confirm.classList.remove('d-none');
    setTimeout(() => confirm.classList.add('d-none'), 2500);
  });

  const wishBtn = document.getElementById('pdp-wishlist') as HTMLButtonElement;
  wishBtn.addEventListener('click', () => {
    const active = toggleWishlist(product.id);
    wishBtn.classList.toggle('active', active);
    wishBtn.innerHTML = heartIcon(active);
  });

  const related = getOthers(product);
  const relatedGrid = document.getElementById('related-grid') as HTMLElement;
  if (related.length === 0) {
    relatedSection.classList.add('d-none');
  } else {
    relatedGrid.innerHTML = related.map(renderCard).join('');
    wireWishlistButtons(relatedGrid);
  }
}
