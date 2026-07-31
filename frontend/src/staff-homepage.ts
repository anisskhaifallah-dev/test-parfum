import { apiFetch } from './api';
import { getToken } from './staff-token';

interface StaffProduct {
  id: string;
  name: string;
  gender: string;
  image: string;
}

interface StaffPack {
  id: string;
  name: string;
  productIds: string[];
  decantMl: number;
  price: number;
  compareAtPrice: number;
  image: string;
}

function renderPreview(pack: StaffPack, selectedIds: string[], allProducts: StaffProduct[]): string {
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

function renderProductChip(p: StaffProduct, packId: string, checked: boolean): string {
  return `
    <label class="d-flex align-items-center gap-2 border rounded p-2 ${checked ? 'border-dark bg-light' : ''}" style="cursor:pointer;" data-chip>
      <input type="checkbox" class="form-check-input m-0" value="${p.id}" id="pack-${packId}-${p.id}" ${checked ? 'checked' : ''} />
      <img src="${p.image}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;" alt="" />
      <span class="fs--1">${p.name}</span>
    </label>
  `;
}

function renderPackEditor(pack: StaffPack, allProducts: StaffProduct[]): string {
  const her = allProducts.filter((p) => p.gender === 'her');
  const him = allProducts.filter((p) => p.gender === 'him');
  return `
    <div class="card p-3 mb-4" data-pack-card="${pack.id}">
      <div class="row g-4">
        <div class="col-md-4">
          <div class="fw-bold fs--2 text-uppercase text-700 mb-2">Preview - what shows on the homepage</div>
          <div class="border rounded p-3 text-center" data-pack-preview="${pack.id}">
            ${renderPreview(pack, pack.productIds, allProducts)}
          </div>
        </div>
        <div class="col-md-8">
          <h6 class="mb-1">${pack.name}</h6>
          <span class="text-700 fs--2 d-block mb-3">${pack.decantMl}ml decants &middot; ${pack.price} DH (was ${pack.compareAtPrice} DH)</span>

          <div class="fw-bold fs--2 text-uppercase text-600 mb-2">For Her</div>
          <div class="d-flex flex-wrap gap-2 mb-3">
            ${her.map((p) => renderProductChip(p, pack.id, pack.productIds.includes(p.id))).join('')}
          </div>

          <div class="fw-bold fs--2 text-uppercase text-600 mb-2">For Him</div>
          <div class="d-flex flex-wrap gap-2 mb-3">
            ${him.map((p) => renderProductChip(p, pack.id, pack.productIds.includes(p.id))).join('')}
          </div>

          <button type="button" class="btn btn-sm btn-dark" data-save-pack="${pack.id}">Save</button>
          <span class="fs--1 ms-2 d-none" data-pack-status="${pack.id}"></span>
        </div>
      </div>
    </div>
  `;
}

export async function initHomepagePanel(): Promise<void> {
  const container = document.getElementById('homepage-packs') as HTMLElement;
  const [packs, products] = await Promise.all([
    apiFetch<StaffPack[]>('/packs', {}, getToken() ?? undefined),
    apiFetch<StaffProduct[]>('/products', {}, getToken() ?? undefined),
  ]);

  container.innerHTML = packs.map((pack) => renderPackEditor(pack, products)).join('');

  packs.forEach((pack) => {
    const card = container.querySelector(`[data-pack-card="${pack.id}"]`) as HTMLElement;
    const preview = card.querySelector(`[data-pack-preview="${pack.id}"]`) as HTMLElement;

    const currentSelection = (): string[] =>
      Array.from(card.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')).map((cb) => cb.value);

    card.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const chip = cb.closest('[data-chip]') as HTMLElement;
        chip.classList.toggle('border-dark', cb.checked);
        chip.classList.toggle('bg-light', cb.checked);
        preview.innerHTML = renderPreview(pack, currentSelection(), products);
      });
    });

    card.querySelector(`[data-save-pack="${pack.id}"]`)!.addEventListener('click', async () => {
      const productIds = currentSelection();
      const status = card.querySelector(`[data-pack-status="${pack.id}"]`) as HTMLElement;
      status.classList.remove('d-none', 'text-danger');
      status.textContent = 'Saving...';
      try {
        await apiFetch(`/packs/${pack.id}`, { method: 'PATCH', body: JSON.stringify({ productIds }) }, getToken() ?? undefined);
        status.textContent = 'Saved.';
        setTimeout(() => status.classList.add('d-none'), 1500);
      } catch (err) {
        status.textContent = err instanceof Error ? err.message : 'Save failed';
        status.classList.add('text-danger');
      }
    });
  });
}
