import { apiFetch, API_BASE } from './api';
import { getToken } from './staff-token';
import { escapeHtml } from './escape-html';

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
  blurb: string;
  image: string;
  showOnHomepage: boolean;
}

let allProducts: StaffProduct[] = [];
let editingPackId: string | null = null;
let currentPackImageUrl = '';

function renderProductChip(p: StaffProduct, checked: boolean): string {
  return `
    <label class="d-flex align-items-center gap-2 border rounded p-2 ${checked ? 'border-dark bg-light' : ''}" style="cursor:pointer;" data-pack-chip>
      <input type="checkbox" class="form-check-input m-0" value="${p.id}" ${checked ? 'checked' : ''} />
      <img src="${p.image}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;" alt="" />
      <span class="fs--1">${escapeHtml(p.name)}</span>
    </label>
  `;
}

function renderProductPicker(selectedIds: string[]): string {
  const her = allProducts.filter((p) => p.gender === 'her');
  const him = allProducts.filter((p) => p.gender === 'him');
  return `
    <div class="fw-bold fs--2 text-uppercase text-600 mb-2">For Her</div>
    <div class="d-flex flex-wrap gap-2 mb-3">${her.map((p) => renderProductChip(p, selectedIds.includes(p.id))).join('')}</div>
    <div class="fw-bold fs--2 text-uppercase text-600 mb-2">For Him</div>
    <div class="d-flex flex-wrap gap-2 mb-3">${him.map((p) => renderProductChip(p, selectedIds.includes(p.id))).join('')}</div>
  `;
}

function pickerContainer(): HTMLElement {
  return document.getElementById('pack-product-picker') as HTMLElement;
}

function wireProductPicker(): void {
  pickerContainer()
    .querySelectorAll<HTMLInputElement>('[data-pack-chip] input[type="checkbox"]')
    .forEach((cb) => {
      cb.addEventListener('change', () => {
        const chip = cb.closest('[data-pack-chip]') as HTMLElement;
        chip.classList.toggle('border-dark', cb.checked);
        chip.classList.toggle('bg-light', cb.checked);
      });
    });
}

function collectSelectedProductIds(): string[] {
  return Array.from(pickerContainer().querySelectorAll<HTMLInputElement>('[data-pack-chip] input[type="checkbox"]:checked')).map(
    (cb) => cb.value
  );
}

function setPackImagePreview(url: string): void {
  currentPackImageUrl = url;
  const preview = document.getElementById('pack-image-preview') as HTMLImageElement;
  if (url) {
    preview.src = url;
    preview.classList.remove('d-none');
  } else {
    preview.classList.add('d-none');
  }
}

async function handlePackImageFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const statusEl = document.getElementById('pack-image-status') as HTMLElement;
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
    setPackImagePreview(json.url);
    statusEl.textContent = 'Uploaded.';
    setTimeout(() => statusEl.classList.add('d-none'), 1500);
  } catch (err) {
    statusEl.textContent = err instanceof Error ? err.message : 'Upload failed';
    statusEl.classList.add('text-danger');
  }
}

function resetPackForm(): void {
  editingPackId = null;
  (document.getElementById('pack-form') as HTMLFormElement).reset();
  (document.getElementById('pack-form-title') as HTMLElement).textContent = 'Add pack';
  (document.getElementById('pack-form-error') as HTMLElement).classList.add('d-none');
  (document.getElementById('pack-show-homepage') as HTMLInputElement).checked = true;
  setPackImagePreview('');
  pickerContainer().innerHTML = renderProductPicker([]);
  wireProductPicker();
}

function fillPackForm(pack: StaffPack): void {
  editingPackId = pack.id;
  (document.getElementById('pack-name') as HTMLInputElement).value = pack.name;
  (document.getElementById('pack-decant') as HTMLInputElement).value = String(pack.decantMl);
  (document.getElementById('pack-price') as HTMLInputElement).value = String(pack.price);
  (document.getElementById('pack-compare') as HTMLInputElement).value = String(pack.compareAtPrice);
  (document.getElementById('pack-blurb') as HTMLTextAreaElement).value = pack.blurb;
  (document.getElementById('pack-show-homepage') as HTMLInputElement).checked = pack.showOnHomepage;
  (document.getElementById('pack-form-title') as HTMLElement).textContent = `Edit ${pack.name}`;
  (document.getElementById('pack-form-error') as HTMLElement).classList.add('d-none');
  setPackImagePreview(pack.image);
  pickerContainer().innerHTML = renderProductPicker(pack.productIds);
  wireProductPicker();
  document.getElementById('pack-form')!.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function deletePack(id: string): Promise<void> {
  if (!confirm('Delete this pack? This cannot be undone.')) return;
  try {
    await apiFetch(`/packs/${id}`, { method: 'DELETE' }, getToken() ?? undefined);
    if (editingPackId === id) resetPackForm();
    await loadPacks();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Delete failed');
  }
}

function includedNamesFor(pack: StaffPack): string {
  return pack.productIds
    .map((id) => allProducts.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .map((name) => escapeHtml(name))
    .join(' + ');
}

export async function loadPacks(): Promise<void> {
  const packs = await apiFetch<StaffPack[]>('/packs', {}, getToken() ?? undefined);
  const tbody = document.getElementById('packs-tbody') as HTMLElement;

  tbody.innerHTML = packs
    .map(
      (pack) => `
        <tr>
          <td><img src="${pack.image}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" /></td>
          <td>${escapeHtml(pack.name)}<br /><span class="text-700 fs--2">${pack.id}</span></td>
          <td>${includedNamesFor(pack)}</td>
          <td>${pack.decantMl}ml</td>
          <td>${pack.price} DH <span class="text-700 fs--2 text-decoration-line-through">${pack.compareAtPrice} DH</span></td>
          <td><span class="badge ${pack.showOnHomepage ? 'bg-success' : 'bg-secondary'}">${pack.showOnHomepage ? 'On homepage' : 'Hidden'}</span></td>
          <td class="text-end">
            <button type="button" class="btn btn-sm btn-outline-secondary" data-edit-pack="${pack.id}">Edit</button>
            <button type="button" class="btn btn-sm btn-outline-danger" data-delete-pack="${pack.id}">Delete</button>
          </td>
        </tr>
      `
    )
    .join('');

  tbody.querySelectorAll<HTMLButtonElement>('[data-edit-pack]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pack = packs.find((p) => p.id === btn.dataset.editPack);
      if (pack) fillPackForm(pack);
    });
  });
  tbody.querySelectorAll<HTMLButtonElement>('[data-delete-pack]').forEach((btn) => {
    btn.addEventListener('click', () => deletePack(btn.dataset.deletePack as string));
  });
}

export async function handlePackSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const errorEl = document.getElementById('pack-form-error') as HTMLElement;
  errorEl.classList.add('d-none');

  const productIds = collectSelectedProductIds();
  if (productIds.length === 0) {
    errorEl.textContent = 'Select at least one product for this pack.';
    errorEl.classList.remove('d-none');
    return;
  }
  if (!currentPackImageUrl) {
    errorEl.textContent = 'Please choose an image.';
    errorEl.classList.remove('d-none');
    return;
  }

  const payload = {
    name: (document.getElementById('pack-name') as HTMLInputElement).value,
    decantMl: Number((document.getElementById('pack-decant') as HTMLInputElement).value),
    price: Number((document.getElementById('pack-price') as HTMLInputElement).value),
    compareAtPrice: Number((document.getElementById('pack-compare') as HTMLInputElement).value),
    blurb: (document.getElementById('pack-blurb') as HTMLTextAreaElement).value,
    image: currentPackImageUrl,
    showOnHomepage: (document.getElementById('pack-show-homepage') as HTMLInputElement).checked,
    productIds,
  };

  try {
    if (editingPackId) {
      await apiFetch(`/packs/${editingPackId}`, { method: 'PATCH', body: JSON.stringify(payload) }, getToken() ?? undefined);
    } else {
      await apiFetch('/packs', { method: 'POST', body: JSON.stringify(payload) }, getToken() ?? undefined);
    }
    resetPackForm();
    await loadPacks();
  } catch (err) {
    errorEl.textContent = err instanceof Error ? err.message : 'Save failed';
    errorEl.classList.remove('d-none');
  }
}

export async function initPacksCatalog(): Promise<void> {
  allProducts = await apiFetch<StaffProduct[]>('/products', {}, getToken() ?? undefined);
  resetPackForm();
  await loadPacks();

  document.getElementById('pack-form')!.addEventListener('submit', handlePackSubmit);
  document.getElementById('pack-form-cancel')!.addEventListener('click', resetPackForm);
  document.getElementById('pack-image-file')!.addEventListener('change', handlePackImageFileChange);
}
