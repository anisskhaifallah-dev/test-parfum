import { apiFetch, API_BASE } from './api';
import { getToken, setToken, clearToken } from './staff-token';
import { escapeHtml } from './escape-html';
import { initPacksCatalog } from './staff-packs';

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

interface StaffAccount {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface StaffProductSize {
  ml: number;
  label: string;
  price: number;
}

interface StaffProduct {
  id: string;
  name: string;
  gender: string;
  family: string;
  image: string;
  blurb: string;
  available: boolean;
  sortOrder: number;
  sizes: StaffProductSize[];
}

interface StaffOrderItem {
  kind: string;
  productId: string | null;
  packId: string | null;
  nameSnapshot: string;
  ml: number | null;
  qty: number;
  unitPrice: number;
}

interface StaffOrder {
  id: string;
  status: string;
  paymentMethod: string;
  subtotal: number;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  country: string;
  notes: string | null;
  createdAt: string;
  items: StaffOrderItem[];
}

let currentStaff: StaffAccount | null = null;
let editingProductId: string | null = null;
let currentImageUrl = '';

function priceRange(sizes: StaffProductSize[]): string {
  const prices = sizes.map((s) => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `${min} DH` : `${min}-${max} DH`;
}

function showLogin(message?: string): void {
  (document.getElementById('staff-login') as HTMLElement).classList.remove('d-none');
  (document.getElementById('staff-dashboard') as HTMLElement).classList.add('d-none');
  const err = document.getElementById('login-error') as HTMLElement;
  if (message) {
    err.textContent = message;
    err.classList.remove('d-none');
  } else {
    err.classList.add('d-none');
  }
}

function showDashboard(): void {
  (document.getElementById('staff-login') as HTMLElement).classList.add('d-none');
  (document.getElementById('staff-dashboard') as HTMLElement).classList.remove('d-none');
  (document.getElementById('staff-who') as HTMLElement).textContent =
    `Signed in as ${currentStaff?.email} (${currentStaff?.role})`;
  showPanel('dashboard');
}

let analyticsLoaded = false;
let homepagePanelLoaded = false;

function showPanel(name: string): void {
  document.querySelectorAll<HTMLElement>('.staff-panel').forEach((el) => {
    el.classList.toggle('d-none', el.dataset.panel !== name);
  });
  document.querySelectorAll<HTMLButtonElement>('.staff-nav-link').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.panel === name);
  });

  if (name === 'dashboard' && !analyticsLoaded) {
    analyticsLoaded = true;
    void import('./analytics').then((mod) => mod.initAnalytics());
  }
  if (name === 'homepage' && !homepagePanelLoaded) {
    homepagePanelLoaded = true;
    void import('./staff-homepage').then((mod) => mod.initHomepagePanel());
  }
}

// --- Size rows editor -------------------------------------------------------

function sizeRowsContainer(): HTMLElement {
  return document.getElementById('size-rows') as HTMLElement;
}

function addSizeRow(size?: StaffProductSize): void {
  const row = document.createElement('div');
  row.className = 'row g-2 mb-2 size-row';
  row.innerHTML = `
    <div class="col-3"><input type="number" min="0" class="form-control form-control-sm" placeholder="ml (0 = Full Bottle)" data-field="ml" value="${size?.ml ?? ''}" /></div>
    <div class="col-4"><input type="text" class="form-control form-control-sm" placeholder="Label (auto if blank)" data-field="label" value="${size?.label ?? ''}" /></div>
    <div class="col-3"><input type="number" min="0" class="form-control form-control-sm" placeholder="Price (DH)" data-field="price" value="${size?.price ?? ''}" /></div>
    <div class="col-2"><button type="button" class="btn btn-sm btn-outline-danger w-100" data-remove-size>&times;</button></div>
  `;
  row.querySelector('[data-remove-size]')!.addEventListener('click', () => row.remove());
  sizeRowsContainer().appendChild(row);
}

function resetSizeRows(sizes?: StaffProductSize[]): void {
  sizeRowsContainer().innerHTML = '';
  if (sizes && sizes.length > 0) {
    sizes.forEach((s) => addSizeRow(s));
  } else {
    addSizeRow({ ml: 0, label: '', price: 0 });
  }
}

function collectSizes(): { ml: number; label: string; price: number }[] {
  const rows = Array.from(sizeRowsContainer().querySelectorAll<HTMLElement>('.size-row'));
  return rows
    .map((row) => {
      const ml = Number((row.querySelector('[data-field="ml"]') as HTMLInputElement).value);
      const label = (row.querySelector('[data-field="label"]') as HTMLInputElement).value.trim();
      const price = Number((row.querySelector('[data-field="price"]') as HTMLInputElement).value);
      return { ml, label, price };
    })
    .filter((s) => !Number.isNaN(s.ml) && !Number.isNaN(s.price) && s.price > 0);
}

// --- Image picker ------------------------------------------------------------

function setImagePreview(url: string): void {
  currentImageUrl = url;
  const preview = document.getElementById('product-image-preview') as HTMLImageElement;
  if (url) {
    // Legacy catalog images are frontend-relative paths (e.g. assets/img/gallery/x.webp);
    // staff-uploaded images come back as absolute backend URLs. Both work as-is in <img src>.
    preview.src = url;
    preview.classList.remove('d-none');
  } else {
    preview.classList.add('d-none');
  }
}

async function handleImageFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const statusEl = document.getElementById('product-image-status') as HTMLElement;
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
    setImagePreview(json.url);
    statusEl.textContent = 'Uploaded.';
    setTimeout(() => statusEl.classList.add('d-none'), 1500);
  } catch (err) {
    statusEl.textContent = err instanceof Error ? err.message : 'Upload failed';
    statusEl.classList.add('text-danger');
  }
}

// --- Product form --------------------------------------------------------

function resetProductForm(): void {
  editingProductId = null;
  (document.getElementById('product-form') as HTMLFormElement).reset();
  (document.getElementById('product-form-title') as HTMLElement).textContent = 'Add product';
  (document.getElementById('product-form-error') as HTMLElement).classList.add('d-none');
  (document.getElementById('product-available') as HTMLInputElement).checked = true;
  resetSizeRows();
  setImagePreview('');
}

function fillProductForm(p: StaffProduct): void {
  editingProductId = p.id;
  (document.getElementById('product-name') as HTMLInputElement).value = p.name;
  (document.getElementById('product-gender') as HTMLSelectElement).value = p.gender;
  (document.getElementById('product-family') as HTMLSelectElement).value = p.family;
  (document.getElementById('product-blurb') as HTMLTextAreaElement).value = p.blurb;
  (document.getElementById('product-available') as HTMLInputElement).checked = p.available;
  (document.getElementById('product-form-title') as HTMLElement).textContent = `Edit ${p.name}`;
  (document.getElementById('product-form-error') as HTMLElement).classList.add('d-none');
  resetSizeRows(p.sizes);
  setImagePreview(p.image);
  document.getElementById('product-form')!.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function deleteProduct(id: string): Promise<void> {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  try {
    await apiFetch(`/products/${id}`, { method: 'DELETE' }, getToken() ?? undefined);
    if (editingProductId === id) resetProductForm();
    await loadProducts();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Delete failed');
  }
}

async function toggleAvailability(id: string, makeAvailable: boolean): Promise<void> {
  try {
    await apiFetch(`/products/${id}`, { method: 'PATCH', body: JSON.stringify({ available: makeAvailable }) }, getToken() ?? undefined);
    await loadProducts();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Could not update availability');
  }
}

// Reorders within the product's own gender group only (so "For Her" and "For Him"
// positions never interfere with each other) - this same order drives both the
// category page listing and which products appear first in the homepage teaser.
async function moveProduct(allProducts: StaffProduct[], id: string, direction: 'up' | 'down'): Promise<void> {
  const product = allProducts.find((p) => p.id === id);
  if (!product) return;

  const sameGender = allProducts.filter((p) => p.gender === product.gender);
  const idx = sameGender.findIndex((p) => p.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sameGender.length) return;

  const reordered = [...sameGender];
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
  const slots = sameGender.map((p) => p.sortOrder).sort((a, b) => a - b);

  try {
    await Promise.all(
      reordered.map((p, i) =>
        apiFetch(`/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ sortOrder: slots[i] }) }, getToken() ?? undefined)
      )
    );
    await loadProducts();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Could not reorder');
  }
}

async function loadProducts(): Promise<void> {
  const products = await apiFetch<StaffProduct[]>('/products', {}, getToken() ?? undefined);
  const tbody = document.getElementById('products-tbody') as HTMLElement;

  tbody.innerHTML = products
    .map((p) => {
      const sameGender = products.filter((x) => x.gender === p.gender);
      const posInGender = sameGender.findIndex((x) => x.id === p.id);
      const isFirst = posInGender === 0;
      const isLast = posInGender === sameGender.length - 1;
      return `
        <tr>
          <td>
            <div class="d-flex flex-column">
              <button type="button" class="btn btn-sm btn-link p-0" data-move="${p.id}" data-direction="up" ${isFirst ? 'disabled' : ''} title="Move up in ${p.gender === 'her' ? 'For Her' : 'For Him'}">&uarr;</button>
              <button type="button" class="btn btn-sm btn-link p-0" data-move="${p.id}" data-direction="down" ${isLast ? 'disabled' : ''} title="Move down in ${p.gender === 'her' ? 'For Her' : 'For Him'}">&darr;</button>
            </div>
          </td>
          <td><img src="${p.image}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" /></td>
          <td>${escapeHtml(p.name)}<br /><span class="text-700 fs--2">${p.id}</span></td>
          <td>${escapeHtml(p.gender)} <span class="text-700 fs--2">(#${posInGender + 1})</span></td>
          <td>${escapeHtml(p.family)}</td>
          <td>${p.sizes.map((s) => escapeHtml(s.label)).join(', ')}</td>
          <td>${priceRange(p.sizes)}</td>
          <td><span class="badge ${p.available ? 'bg-success' : 'bg-secondary'}">${p.available ? 'Available' : 'Unavailable'}</span></td>
          <td class="text-end">
            <button type="button" class="btn btn-sm btn-outline-secondary" data-edit="${p.id}">Edit</button>
            <button type="button" class="btn btn-sm ${p.available ? 'btn-outline-warning' : 'btn-outline-success'}" data-toggle-available="${p.id}" data-next="${p.available ? 'false' : 'true'}">${p.available ? 'Mark Unavailable' : 'Mark Available'}</button>
            <button type="button" class="btn btn-sm btn-outline-danger" data-delete="${p.id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('');

  tbody.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((btn) => {
    btn.addEventListener('click', () => {
      moveProduct(products, btn.dataset.move as string, btn.dataset.direction as 'up' | 'down');
    });
  });
  tbody.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const product = products.find((p) => p.id === btn.dataset.edit);
      if (product) fillProductForm(product);
    });
  });
  tbody.querySelectorAll<HTMLButtonElement>('[data-toggle-available]').forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleAvailability(btn.dataset.toggleAvailable as string, btn.dataset.next === 'true');
    });
  });
  tbody.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.delete as string));
  });
}

async function handleProductSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const errorEl = document.getElementById('product-form-error') as HTMLElement;
  errorEl.classList.add('d-none');

  const sizes = collectSizes();
  if (sizes.length === 0) {
    errorEl.textContent = 'Add at least one size with a price.';
    errorEl.classList.remove('d-none');
    return;
  }
  if (!currentImageUrl) {
    errorEl.textContent = 'Please choose an image.';
    errorEl.classList.remove('d-none');
    return;
  }

  const payload = {
    name: (document.getElementById('product-name') as HTMLInputElement).value,
    gender: (document.getElementById('product-gender') as HTMLSelectElement).value,
    family: (document.getElementById('product-family') as HTMLSelectElement).value,
    image: currentImageUrl,
    blurb: (document.getElementById('product-blurb') as HTMLTextAreaElement).value,
    available: (document.getElementById('product-available') as HTMLInputElement).checked,
    sizes,
  };

  try {
    if (editingProductId) {
      await apiFetch(`/products/${editingProductId}`, { method: 'PATCH', body: JSON.stringify(payload) }, getToken() ?? undefined);
    } else {
      await apiFetch('/products', { method: 'POST', body: JSON.stringify(payload) }, getToken() ?? undefined);
    }
    resetProductForm();
    await loadProducts();
  } catch (err) {
    errorEl.textContent = err instanceof Error ? err.message : 'Save failed';
    errorEl.classList.remove('d-none');
  }
}

// --- Orders ------------------------------------------------------------------

function describeItems(items: StaffOrderItem[]): string {
  return items.map((i) => `${i.qty}&times; ${escapeHtml(i.nameSnapshot)}${i.ml ? ` (${i.ml}ml)` : ''}`).join('<br />');
}

async function updateOrderStatus(id: string, status: string): Promise<void> {
  await apiFetch(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, getToken() ?? undefined);
}

async function deleteOrder(id: string, statusFilter?: string): Promise<void> {
  if (!confirm('Delete this order? This cannot be undone.')) return;
  try {
    await apiFetch(`/orders/${id}`, { method: 'DELETE' }, getToken() ?? undefined);
    await loadOrders(statusFilter);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Delete failed');
  }
}

async function loadOrders(statusFilter?: string): Promise<void> {
  const query = statusFilter ? `?status=${statusFilter}` : '';
  const orders = await apiFetch<StaffOrder[]>(`/orders${query}`, {}, getToken() ?? undefined);
  const tbody = document.getElementById('orders-tbody') as HTMLElement;

  tbody.innerHTML = orders
    .map(
      (o) => `
        <tr>
          <td>${new Date(o.createdAt).toLocaleString()}</td>
          <td>${escapeHtml(o.fullName)}<br /><span class="text-700 fs--2">${escapeHtml(o.phone)}</span></td>
          <td>${escapeHtml(o.line1)}${o.line2 ? `, ${escapeHtml(o.line2)}` : ''}, ${escapeHtml(o.city)}, ${escapeHtml(o.country)}</td>
          <td>${describeItems(o.items)}</td>
          <td>${escapeHtml(o.notes)}</td>
          <td>${o.subtotal} DH</td>
          <td>
            <select class="form-select form-select-sm status-select status-${o.status}" data-order="${o.id}">
              ${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
          <td class="text-end">
            <button type="button" class="btn btn-sm btn-outline-danger" data-delete-order="${o.id}">Delete</button>
          </td>
        </tr>
      `
    )
    .join('');

  tbody.querySelectorAll<HTMLSelectElement>('select[data-order]').forEach((select) => {
    select.addEventListener('change', async () => {
      const filter = (document.getElementById('orders-status-filter') as HTMLSelectElement).value || undefined;
      try {
        await updateOrderStatus(select.dataset.order as string, select.value);
        await loadOrders(filter);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Could not update order status');
      }
    });
  });

  tbody.querySelectorAll<HTMLButtonElement>('[data-delete-order]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = (document.getElementById('orders-status-filter') as HTMLSelectElement).value || undefined;
      void deleteOrder(btn.dataset.deleteOrder as string, filter);
    });
  });
}

// --- Auth ----------------------------------------------------------------

async function handleLogin(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const email = (document.getElementById('login-email') as HTMLInputElement).value;
  const password = (document.getElementById('login-password') as HTMLInputElement).value;

  try {
    const result = await apiFetch<{ token: string; staff: StaffAccount }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.token);
    currentStaff = result.staff;
    showDashboard();
    await Promise.all([loadProducts(), loadOrders(), initPacksCatalog()]);
  } catch (err) {
    showLogin(err instanceof Error ? err.message : 'Login failed');
  }
}

function handleLogout(): void {
  clearToken();
  currentStaff = null;
  showLogin();
}

async function tryResume(): Promise<void> {
  const token = getToken();
  if (!token) {
    showLogin();
    return;
  }
  try {
    currentStaff = await apiFetch<StaffAccount>('/auth/me', {}, token);
    showDashboard();
    await Promise.all([loadProducts(), loadOrders(), initPacksCatalog()]);
  } catch {
    clearToken();
    showLogin();
  }
}

export function initStaffPage(): void {
  document.getElementById('login-form')!.addEventListener('submit', handleLogin);
  document.getElementById('logout-btn')!.addEventListener('click', handleLogout);
  document.getElementById('login-password-toggle')!.addEventListener('click', () => {
    const input = document.getElementById('login-password') as HTMLInputElement;
    const btn = document.getElementById('login-password-toggle') as HTMLButtonElement;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.textContent = showing ? 'Show' : 'Hide';
  });
  document.querySelectorAll<HTMLButtonElement>('.staff-nav-link').forEach((btn) => {
    btn.addEventListener('click', () => showPanel(btn.dataset.panel as string));
  });
  document.getElementById('product-form')!.addEventListener('submit', handleProductSubmit);
  document.getElementById('product-form-cancel')!.addEventListener('click', resetProductForm);
  document.getElementById('add-size-row')!.addEventListener('click', () => addSizeRow());
  document.getElementById('product-image-file')!.addEventListener('change', handleImageFileChange);
  document.getElementById('orders-status-filter')!.addEventListener('change', (e) => {
    loadOrders((e.target as HTMLSelectElement).value || undefined);
  });

  resetSizeRows();
  void tryResume();
}
