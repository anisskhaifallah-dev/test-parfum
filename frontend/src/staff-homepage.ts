import { apiFetch } from './api';
import { getToken } from './staff-token';

interface StaffProduct {
  id: string;
  name: string;
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

function renderPackEditor(pack: StaffPack, allProducts: StaffProduct[]): string {
  return `
    <div class="card p-3 mb-3" data-pack-card="${pack.id}">
      <div class="d-flex align-items-center gap-3 mb-3">
        <img src="${pack.image}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;" />
        <div>
          <h6 class="mb-0">${pack.name}</h6>
          <span class="text-700 fs--2">${pack.price} DH &middot; ${pack.decantMl}ml decants</span>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-3 mb-3">
        ${allProducts
          .map(
            (p) => `
          <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${p.id}" id="pack-${pack.id}-${p.id}" ${pack.productIds.includes(p.id) ? 'checked' : ''} />
            <label class="form-check-label fs--1" for="pack-${pack.id}-${p.id}">${p.name}</label>
          </div>
        `
          )
          .join('')}
      </div>
      <div>
        <button type="button" class="btn btn-sm btn-dark" data-save-pack="${pack.id}">Save</button>
        <span class="fs--1 ms-2 d-none" data-pack-status="${pack.id}"></span>
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

  container.querySelectorAll<HTMLButtonElement>('[data-save-pack]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const packId = btn.dataset.savePack as string;
      const card = container.querySelector(`[data-pack-card="${packId}"]`) as HTMLElement;
      const productIds = Array.from(
        card.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')
      ).map((cb) => cb.value);
      const status = card.querySelector(`[data-pack-status="${packId}"]`) as HTMLElement;

      status.classList.remove('d-none', 'text-danger');
      status.textContent = 'Saving...';
      try {
        await apiFetch(`/packs/${packId}`, { method: 'PATCH', body: JSON.stringify({ productIds }) }, getToken() ?? undefined);
        status.textContent = 'Saved.';
        setTimeout(() => status.classList.add('d-none'), 1500);
      } catch (err) {
        status.textContent = err instanceof Error ? err.message : 'Save failed';
        status.classList.add('text-danger');
      }
    });
  });
}
