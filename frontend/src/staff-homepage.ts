import { apiFetch } from './api';
import { getToken } from './staff-token';
import { escapeHtml } from './escape-html';

interface StaffProduct {
  id: string;
  name: string;
  gender: string;
  image: string;
  featured: boolean;
}

interface StaffPack {
  id: string;
  name: string;
  productIds: string[];
  decantMl: number;
  price: number;
  compareAtPrice: number;
  blurb: string;
  image: string;
  showOnHomepage: boolean;
  available: boolean;
}

let allProducts: StaffProduct[] = [];

// --- Featured products (For Her / For Him) --------------------------------------

function renderFeaturedPreview(gender: string): string {
  const featured = allProducts.filter((p) => p.gender === gender && p.featured);
  if (featured.length === 0) {
    return `<p class="text-700 fs--1 mb-0">Nothing selected - this section will be empty on the homepage.</p>`;
  }
  return `
    <div class="row g-2">
      ${featured
        .map(
          (p) => `
        <div class="col-6">
          <div class="position-relative rounded overflow-hidden" style="aspect-ratio:1/1;">
            <img src="${p.image}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:cover;" />
            <span class="position-absolute bottom-0 start-0 end-0 p-1 fs--2 text-white text-center" style="background:rgba(0,0,0,.55);">${escapeHtml(p.name)}</span>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function refreshFeaturedPreview(gender: string): void {
  const preview = document.getElementById(`featured-preview-${gender}`);
  if (preview) preview.innerHTML = renderFeaturedPreview(gender);
}

function renderFeaturedChip(p: StaffProduct): string {
  return `
    <label class="d-flex align-items-center gap-2 border rounded p-2 ${p.featured ? 'border-dark bg-light' : ''}" style="cursor:pointer;" data-featured-chip="${p.id}">
      <input type="checkbox" class="form-check-input m-0" data-featured-toggle="${p.id}" ${p.featured ? 'checked' : ''} />
      <img src="${p.image}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;" alt="" />
      <span class="fs--1">${escapeHtml(p.name)}</span>
    </label>
  `;
}

function renderFeaturedGenderCard(gender: string, label: string): string {
  const products = allProducts.filter((p) => p.gender === gender);
  return `
    <div class="card p-3 mb-4">
      <h6 class="text-uppercase fs--2 text-600 mb-2">${label} &mdash; homepage preview</h6>
      <div class="border rounded p-3 mb-3" id="featured-preview-${gender}">${renderFeaturedPreview(gender)}</div>
      <div class="d-flex flex-wrap gap-2">${products.map(renderFeaturedChip).join('')}</div>
    </div>
  `;
}

function renderFeaturedSection(): string {
  return renderFeaturedGenderCard('her', 'For Her') + renderFeaturedGenderCard('him', 'For Him');
}

function wireFeaturedSection(root: HTMLElement): void {
  root.querySelectorAll<HTMLInputElement>('[data-featured-toggle]').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const id = cb.dataset.featuredToggle as string;
      const product = allProducts.find((p) => p.id === id)!;
      const chip = cb.closest('[data-featured-chip]') as HTMLElement;
      const wasChecked = !cb.checked;
      cb.disabled = true;
      try {
        await apiFetch(`/products/${id}`, { method: 'PATCH', body: JSON.stringify({ featured: cb.checked }) }, getToken() ?? undefined);
        product.featured = cb.checked;
        chip.classList.toggle('border-dark', cb.checked);
        chip.classList.toggle('bg-light', cb.checked);
        refreshFeaturedPreview(product.gender);
      } catch (err) {
        cb.checked = wasChecked;
        alert(err instanceof Error ? err.message : 'Could not update');
      } finally {
        cb.disabled = false;
      }
    });
  });
}

// --- Packs (visibility only - creating/editing/deleting packs happens in the
// Catalogs tab, see staff-packs.ts) -------------------------------------------

function renderPackVisibilityRow(pack: StaffPack): string {
  return `
    <label class="d-flex align-items-center gap-3 border rounded p-2 mb-2" style="cursor:pointer;" data-pack-visibility-row="${pack.id}">
      <input type="checkbox" class="form-check-input m-0" data-pack-visibility-toggle="${pack.id}" ${pack.showOnHomepage ? 'checked' : ''} />
      <img src="${pack.image}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;" alt="" />
      <span class="fs--1 fw-bold">${escapeHtml(pack.name)}</span>
    </label>
  `;
}

function wirePacksVisibility(container: HTMLElement): void {
  container.querySelectorAll<HTMLInputElement>('[data-pack-visibility-toggle]').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const id = cb.dataset.packVisibilityToggle as string;
      const wasChecked = !cb.checked;
      cb.disabled = true;
      try {
        await apiFetch(`/packs/${id}`, { method: 'PATCH', body: JSON.stringify({ showOnHomepage: cb.checked }) }, getToken() ?? undefined);
      } catch (err) {
        cb.checked = wasChecked;
        alert(err instanceof Error ? err.message : 'Could not update');
      } finally {
        cb.disabled = false;
      }
    });
  });
}

async function loadAndRenderPacksVisibility(): Promise<void> {
  const container = document.getElementById('homepage-packs') as HTMLElement;
  const packs = await apiFetch<StaffPack[]>('/packs', {}, getToken() ?? undefined);

  // Retired (unavailable) packs never show on the homepage regardless of this toggle,
  // so there's nothing useful to control here for one - leave it out of this list.
  container.innerHTML = packs
    .filter((p) => p.available)
    .map(renderPackVisibilityRow)
    .join('');
  wirePacksVisibility(container);
}

// --- Panel entry point --------------------------------------------------------

export async function initHomepagePanel(): Promise<void> {
  allProducts = await apiFetch<StaffProduct[]>('/products', {}, getToken() ?? undefined);

  const featuredContainer = document.getElementById('homepage-featured') as HTMLElement;
  featuredContainer.innerHTML = renderFeaturedSection();
  wireFeaturedSection(featuredContainer);

  await loadAndRenderPacksVisibility();
}
