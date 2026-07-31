import { apiFetch, API_BASE } from './api';
import { getToken } from './staff-token';

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
            <img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;" />
            <span class="position-absolute bottom-0 start-0 end-0 p-1 fs--2 text-white text-center" style="background:rgba(0,0,0,.55);">${p.name}</span>
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
      <span class="fs--1">${p.name}</span>
    </label>
  `;
}

function renderFeaturedSection(): string {
  const her = allProducts.filter((p) => p.gender === 'her');
  const him = allProducts.filter((p) => p.gender === 'him');
  return `
    <div class="row g-4">
      <div class="col-md-6">
        <h6 class="text-uppercase fs--2 text-600 mb-2">For Her &mdash; homepage preview</h6>
        <div class="border rounded p-3 mb-3" id="featured-preview-her">${renderFeaturedPreview('her')}</div>
        <div class="d-flex flex-wrap gap-2">${her.map(renderFeaturedChip).join('')}</div>
      </div>
      <div class="col-md-6">
        <h6 class="text-uppercase fs--2 text-600 mb-2">For Him &mdash; homepage preview</h6>
        <div class="border rounded p-3 mb-3" id="featured-preview-him">${renderFeaturedPreview('him')}</div>
        <div class="d-flex flex-wrap gap-2">${him.map(renderFeaturedChip).join('')}</div>
      </div>
    </div>
  `;
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

// --- Packs ------------------------------------------------------------------

function renderPackPreview(pack: StaffPack, selectedIds: string[]): string {
  const includedNames = selectedIds
    .map((id) => allProducts.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(' + ');
  return `
    <img class="mx-auto mb-2" src="${pack.image}" width="90" height="90" style="object-fit:cover;border-radius:50%;" alt="${pack.name}" />
    <div class="fw-bold">${pack.name}</div>
    <p class="text-700 fs--2 mb-1">${includedNames ? `${includedNames}, ${pack.decantMl}ml each` : 'No products selected yet'}</p>
    <div class="fw-bold fs--1">${pack.price} DH <span class="text-600 text-decoration-line-through">${pack.compareAtPrice} DH</span></div>
  `;
}

function renderProductChip(p: StaffProduct, groupId: string, checked: boolean): string {
  return `
    <label class="d-flex align-items-center gap-2 border rounded p-2 ${checked ? 'border-dark bg-light' : ''}" style="cursor:pointer;" data-chip>
      <input type="checkbox" class="form-check-input m-0" value="${p.id}" id="${groupId}-${p.id}" ${checked ? 'checked' : ''} />
      <img src="${p.image}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;" alt="" />
      <span class="fs--1">${p.name}</span>
    </label>
  `;
}

function renderProductPicker(groupId: string, selectedIds: string[]): string {
  const her = allProducts.filter((p) => p.gender === 'her');
  const him = allProducts.filter((p) => p.gender === 'him');
  return `
    <div class="fw-bold fs--2 text-uppercase text-600 mb-2">For Her</div>
    <div class="d-flex flex-wrap gap-2 mb-3">${her.map((p) => renderProductChip(p, groupId, selectedIds.includes(p.id))).join('')}</div>
    <div class="fw-bold fs--2 text-uppercase text-600 mb-2">For Him</div>
    <div class="d-flex flex-wrap gap-2 mb-3">${him.map((p) => renderProductChip(p, groupId, selectedIds.includes(p.id))).join('')}</div>
  `;
}

function renderPackEditor(pack: StaffPack): string {
  return `
    <div class="card p-3 mb-4" data-pack-card="${pack.id}">
      <div class="row g-4">
        <div class="col-md-4">
          <div class="fw-bold fs--2 text-uppercase text-700 mb-2">Preview - what shows on the homepage</div>
          <div class="border rounded p-3 text-center" data-pack-preview="${pack.id}">
            ${renderPackPreview(pack, pack.productIds)}
          </div>
        </div>
        <div class="col-md-8">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <h6 class="mb-0">${pack.name}</h6>
            <button type="button" class="btn btn-sm btn-outline-danger" data-delete-pack="${pack.id}">Delete</button>
          </div>
          <span class="text-700 fs--2 d-block mb-2">${pack.decantMl}ml decants &middot; ${pack.price} DH (was ${pack.compareAtPrice} DH)</span>
          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" id="pack-${pack.id}-visible" data-pack-visible ${pack.showOnHomepage ? 'checked' : ''} />
            <label class="form-check-label fs--1" for="pack-${pack.id}-visible">Show this pack on the homepage</label>
          </div>

          ${renderProductPicker(`pack-${pack.id}`, pack.productIds)}

          <button type="button" class="btn btn-sm btn-dark" data-save-pack="${pack.id}">Save</button>
          <span class="fs--1 ms-2 d-none" data-pack-status="${pack.id}"></span>
        </div>
      </div>
    </div>
  `;
}

function wirePackEditor(container: HTMLElement, pack: StaffPack, onDeleted: () => void): void {
  const card = container.querySelector(`[data-pack-card="${pack.id}"]`) as HTMLElement;
  const preview = card.querySelector(`[data-pack-preview="${pack.id}"]`) as HTMLElement;

  // Scoped to [data-chip] specifically so this never picks up the separate
  // "show on homepage" checkbox, which lives outside the product picker.
  const currentSelection = (): string[] =>
    Array.from(card.querySelectorAll<HTMLInputElement>('[data-chip] input[type="checkbox"]:checked')).map((cb) => cb.value);

  card.querySelectorAll<HTMLInputElement>('[data-chip] input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const chip = cb.closest('[data-chip]') as HTMLElement;
      chip.classList.toggle('border-dark', cb.checked);
      chip.classList.toggle('bg-light', cb.checked);
      preview.innerHTML = renderPackPreview(pack, currentSelection());
    });
  });

  card.querySelector(`[data-save-pack="${pack.id}"]`)!.addEventListener('click', async () => {
    const productIds = currentSelection();
    const showOnHomepage = (card.querySelector('[data-pack-visible]') as HTMLInputElement).checked;
    const status = card.querySelector(`[data-pack-status="${pack.id}"]`) as HTMLElement;
    status.classList.remove('d-none', 'text-danger');
    status.textContent = 'Saving...';
    try {
      await apiFetch(`/packs/${pack.id}`, { method: 'PATCH', body: JSON.stringify({ productIds, showOnHomepage }) }, getToken() ?? undefined);
      status.textContent = 'Saved.';
      setTimeout(() => status.classList.add('d-none'), 1500);
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : 'Save failed';
      status.classList.add('text-danger');
    }
  });

  card.querySelector(`[data-delete-pack="${pack.id}"]`)!.addEventListener('click', async () => {
    if (!confirm(`Delete "${pack.name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/packs/${pack.id}`, { method: 'DELETE' }, getToken() ?? undefined);
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  });
}

// --- Create new pack ----------------------------------------------------------

let newPackImageUrl = '';

function renderCreatePackForm(): string {
  return `
    <div class="card p-3 mb-4">
      <h6 class="mb-3">Create a new pack</h6>
      <form id="new-pack-form" class="row g-2">
        <div class="col-md-6"><input class="form-control" id="new-pack-name" placeholder="Name" required /></div>
        <div class="col-md-2"><input class="form-control" id="new-pack-decant" type="number" min="1" placeholder="ml each" required /></div>
        <div class="col-md-2"><input class="form-control" id="new-pack-price" type="number" min="1" placeholder="Price (DH)" required /></div>
        <div class="col-md-2"><input class="form-control" id="new-pack-compare" type="number" min="1" placeholder="Compare-at (DH)" required /></div>

        <div class="col-12">
          <label class="form-label fs--1 text-700 mb-1">Image</label>
          <div class="d-flex align-items-center gap-3">
            <img id="new-pack-image-preview" class="d-none" style="width:64px;height:64px;object-fit:cover;border-radius:6px;" alt="" />
            <input class="form-control" id="new-pack-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="max-width:320px;" />
            <span id="new-pack-image-status" class="fs--1 d-none"></span>
          </div>
        </div>

        <div class="col-12"><textarea class="form-control" id="new-pack-blurb" placeholder="Short description" rows="2" required></textarea></div>

        <div class="col-12" id="new-pack-picker">${renderProductPicker('new-pack', [])}</div>

        <div class="col-12">
          <button class="btn btn-dark" type="submit">Create pack</button>
          <div id="new-pack-error" class="text-danger fs--1 mt-2 d-none"></div>
        </div>
      </form>
    </div>
  `;
}

function wireCreatePackForm(root: HTMLElement, onCreated: () => void): void {
  const form = root.querySelector('#new-pack-form') as HTMLFormElement;

  root.querySelector('#new-pack-image-file')!.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const statusEl = root.querySelector('#new-pack-image-status') as HTMLElement;
    statusEl.textContent = 'Uploading...';
    statusEl.classList.remove('d-none', 'text-danger');

    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch(`${API_BASE}/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Upload failed');
      newPackImageUrl = json.url;
      const preview = root.querySelector('#new-pack-image-preview') as HTMLImageElement;
      preview.src = newPackImageUrl;
      preview.classList.remove('d-none');
      statusEl.textContent = 'Uploaded.';
      setTimeout(() => statusEl.classList.add('d-none'), 1500);
    } catch (err) {
      statusEl.textContent = err instanceof Error ? err.message : 'Upload failed';
      statusEl.classList.add('text-danger');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = root.querySelector('#new-pack-error') as HTMLElement;
    errorEl.classList.add('d-none');

    const productIds = Array.from(
      root.querySelectorAll<HTMLInputElement>('#new-pack-picker input[type="checkbox"]:checked')
    ).map((cb) => cb.value);

    if (productIds.length === 0) {
      errorEl.textContent = 'Select at least one product for this pack.';
      errorEl.classList.remove('d-none');
      return;
    }
    if (!newPackImageUrl) {
      errorEl.textContent = 'Please choose an image.';
      errorEl.classList.remove('d-none');
      return;
    }

    const payload = {
      name: (root.querySelector('#new-pack-name') as HTMLInputElement).value,
      decantMl: Number((root.querySelector('#new-pack-decant') as HTMLInputElement).value),
      price: Number((root.querySelector('#new-pack-price') as HTMLInputElement).value),
      compareAtPrice: Number((root.querySelector('#new-pack-compare') as HTMLInputElement).value),
      blurb: (root.querySelector('#new-pack-blurb') as HTMLTextAreaElement).value,
      image: newPackImageUrl,
      productIds,
    };

    try {
      await apiFetch('/packs', { method: 'POST', body: JSON.stringify(payload) }, getToken() ?? undefined);
      newPackImageUrl = '';
      onCreated();
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : 'Could not create pack';
      errorEl.classList.remove('d-none');
    }
  });
}

// --- Panel entry point --------------------------------------------------------

async function loadAndRenderPacks(): Promise<void> {
  const packsContainer = document.getElementById('homepage-packs') as HTMLElement;
  const packs = await apiFetch<StaffPack[]>('/packs', {}, getToken() ?? undefined);

  packsContainer.innerHTML = packs.map((pack) => renderPackEditor(pack)).join('') + renderCreatePackForm();
  packs.forEach((pack) => wirePackEditor(packsContainer, pack, () => void loadAndRenderPacks()));
  wireCreatePackForm(packsContainer, () => void loadAndRenderPacks());
}

export async function initHomepagePanel(): Promise<void> {
  allProducts = await apiFetch<StaffProduct[]>('/products', {}, getToken() ?? undefined);

  const featuredContainer = document.getElementById('homepage-featured') as HTMLElement;
  featuredContainer.innerHTML = renderFeaturedSection();
  wireFeaturedSection(featuredContainer);

  await loadAndRenderPacks();
}
