// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initPacksCatalog } from './staff-packs';

const PRODUCTS = [
  { id: 'jasmin-blanc', name: 'Jasmin Blanc', gender: 'her', image: 'jasmin.webp' },
  { id: 'ambre-precieux', name: 'Ambre Precieux', gender: 'her', image: 'ambre.webp' },
  { id: 'oud-essentiel', name: 'Oud Essentiel', gender: 'him', image: 'oud.webp' },
];

const EXISTING_PACK = {
  id: 'her-duo',
  name: 'Her Duo',
  productIds: ['jasmin-blanc', 'ambre-precieux'],
  decantMl: 10,
  price: 38,
  compareAtPrice: 45,
  blurb: 'Two of our favorites.',
  image: 'her-duo.webp',
  showOnHomepage: true,
};

function setupDom() {
  document.body.innerHTML = `
    <table><tbody id="packs-tbody"></tbody></table>
    <h5 id="pack-form-title"></h5>
    <form id="pack-form">
      <input id="pack-name" />
      <input id="pack-decant" type="number" />
      <input id="pack-price" type="number" />
      <input id="pack-compare" type="number" />
      <img id="pack-image-preview" class="d-none" />
      <input id="pack-image-file" type="file" />
      <span id="pack-image-status" class="d-none"></span>
      <textarea id="pack-blurb"></textarea>
      <div id="pack-product-picker"></div>
      <input id="pack-show-homepage" type="checkbox" checked />
      <button type="submit">Save</button>
      <div id="pack-form-error" class="d-none"></div>
    </form>
    <button type="button" id="pack-form-cancel">Cancel</button>
  `;
}

function mockRoutedFetch(packs: typeof EXISTING_PACK[] = [EXISTING_PACK]) {
  return vi.fn(async (url: string, opts: RequestInit = {}) => {
    const method = opts.method ?? 'GET';

    if (url.endsWith('/products') && method === 'GET') {
      return { ok: true, json: async () => PRODUCTS };
    }
    if (url.endsWith('/packs') && method === 'GET') {
      return { ok: true, json: async () => packs };
    }
    if (url.endsWith('/uploads') && method === 'POST') {
      return { ok: true, json: async () => ({ url: 'https://api.example.com/uploads/new-image.webp' }) };
    }
    if (url.endsWith('/packs') && method === 'POST') {
      return { ok: true, json: async () => ({ ...EXISTING_PACK, id: 'new-pack' }) };
    }
    if (/\/packs\/[^/]+$/.test(url) && method === 'PATCH') {
      return { ok: true, json: async () => EXISTING_PACK };
    }
    if (/\/packs\/[^/]+$/.test(url) && method === 'DELETE') {
      return { ok: true, json: async () => ({ ok: true }) };
    }
    throw new Error(`Unhandled request in test: ${method} ${url}`);
  });
}

// jsdom doesn't implement DataTransfer, so `files` is set directly with a minimal
// FileList-shaped stand-in instead of going through a real drag/drop-style API.
async function selectImageFile() {
  const input = document.getElementById('pack-image-file') as HTMLInputElement;
  const file = new File(['fake-bytes'], 'photo.webp', { type: 'image/webp' });
  const fakeFileList = Object.assign([file], { item: (i: number) => (i === 0 ? file : null) });
  Object.defineProperty(input, 'files', { value: fakeFileList, configurable: true });
  input.dispatchEvent(new Event('change'));
  await flushAsync();
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// jsdom doesn't provide localStorage unless explicitly configured - getToken() (used
// throughout staff-packs.ts) needs a working one.
function stubLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  });
}

describe('staff pack catalog management', () => {
  beforeEach(() => {
    stubLocalStorage();
    // jsdom doesn't implement layout, so scrollIntoView isn't defined at all.
    Element.prototype.scrollIntoView ??= () => {};
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the packs table and the product picker on load', async () => {
    setupDom();
    vi.stubGlobal('fetch', mockRoutedFetch());

    await initPacksCatalog();

    const tbody = document.getElementById('packs-tbody') as HTMLElement;
    expect(tbody.textContent).toContain('Her Duo');
    expect(tbody.textContent).toContain('Jasmin Blanc + Ambre Precieux');

    const picker = document.getElementById('pack-product-picker') as HTMLElement;
    expect(picker.textContent).toContain('Jasmin Blanc');
    expect(picker.textContent).toContain('Oud Essentiel');
  });

  it('creates a new pack with the selected products and uploaded image', async () => {
    setupDom();
    const fetchSpy = mockRoutedFetch();
    vi.stubGlobal('fetch', fetchSpy);

    await initPacksCatalog();
    await selectImageFile();

    (document.getElementById('pack-name') as HTMLInputElement).value = 'New Combo';
    (document.getElementById('pack-decant') as HTMLInputElement).value = '10';
    (document.getElementById('pack-price') as HTMLInputElement).value = '40';
    (document.getElementById('pack-compare') as HTMLInputElement).value = '50';
    (document.getElementById('pack-blurb') as HTMLTextAreaElement).value = 'A fresh new pack.';
    document
      .getElementById('pack-product-picker')!
      .querySelector<HTMLInputElement>(`input[value="oud-essentiel"]`)!.checked = true;

    document.getElementById('pack-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync();

    const createCall = fetchSpy.mock.calls.find(([url, opts]) => url.endsWith('/packs') && opts?.method === 'POST');
    expect(createCall).toBeTruthy();
    const body = JSON.parse(createCall![1]!.body as string);
    expect(body.name).toBe('New Combo');
    expect(body.productIds).toContain('oud-essentiel');
    expect(body.image).toBe('https://api.example.com/uploads/new-image.webp');
  });

  it('fills the form on Edit and PATCHes the same pack on save', async () => {
    setupDom();
    const fetchSpy = mockRoutedFetch();
    vi.stubGlobal('fetch', fetchSpy);

    await initPacksCatalog();
    (document.querySelector('[data-edit-pack="her-duo"]') as HTMLButtonElement).click();

    expect((document.getElementById('pack-name') as HTMLInputElement).value).toBe('Her Duo');
    expect((document.getElementById('pack-form-title') as HTMLElement).textContent).toBe('Edit Her Duo');

    document.getElementById('pack-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync();

    const patchCall = fetchSpy.mock.calls.find(([url, opts]) => url.endsWith('/packs/her-duo') && opts?.method === 'PATCH');
    expect(patchCall).toBeTruthy();
    const body = JSON.parse(patchCall![1]!.body as string);
    expect(body.name).toBe('Her Duo');
    expect(body.productIds.sort()).toEqual(['ambre-precieux', 'jasmin-blanc']);
  });

  it('deletes a pack after confirmation', async () => {
    setupDom();
    const fetchSpy = mockRoutedFetch();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('confirm', vi.fn(() => true));

    await initPacksCatalog();
    (document.querySelector('[data-delete-pack="her-duo"]') as HTMLButtonElement).click();
    await flushAsync();

    const deleteCall = fetchSpy.mock.calls.find(([url, opts]) => url.endsWith('/packs/her-duo') && opts?.method === 'DELETE');
    expect(deleteCall).toBeTruthy();
  });
});
