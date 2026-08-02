// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initHomepagePanel } from './staff-homepage';

const PRODUCTS = [{ id: 'jasmin-blanc', name: 'Jasmin Blanc', gender: 'her', image: 'jasmin.webp', featured: true }];

const PACKS = [
  { id: 'her-duo', name: 'Her Duo', productIds: ['jasmin-blanc'], decantMl: 10, price: 38, compareAtPrice: 45, blurb: '', image: 'her-duo.webp', showOnHomepage: true, available: true },
  { id: 'retired-pack', name: 'Retired Pack', productIds: ['jasmin-blanc'], decantMl: 10, price: 30, compareAtPrice: 40, blurb: '', image: 'retired.webp', showOnHomepage: true, available: false },
];

function setupDom() {
  document.body.innerHTML = `
    <div id="homepage-featured"></div>
    <div id="homepage-packs"></div>
  `;
}

function mockRoutedFetch() {
  return vi.fn(async (url: string, opts: RequestInit = {}) => {
    const method = opts.method ?? 'GET';
    if (url.endsWith('/products') && method === 'GET') return { ok: true, json: async () => PRODUCTS };
    if (url.endsWith('/packs') && method === 'GET') return { ok: true, json: async () => PACKS };
    if (/\/packs\/[^/]+$/.test(url) && method === 'PATCH') return { ok: true, json: async () => PACKS[0] };
    throw new Error(`Unhandled request in test: ${method} ${url}`);
  });
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// jsdom doesn't provide localStorage unless explicitly configured - getToken() (used
// throughout staff-homepage.ts) needs a working one.
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

describe('homepage panel pack visibility toggle', () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders one toggle row per pack, with no product picker or delete button', async () => {
    setupDom();
    vi.stubGlobal('fetch', mockRoutedFetch());

    await initHomepagePanel();

    const container = document.getElementById('homepage-packs') as HTMLElement;
    expect(container.textContent).toContain('Her Duo');
    expect(container.querySelector('[data-pack-visibility-toggle="her-duo"]')).toBeTruthy();
    expect(container.querySelector('[data-delete-pack]')).toBeNull();
    expect(container.querySelector('input[type="checkbox"][value]')).toBeNull(); // no product-selection chips
  });

  it('excludes retired (unavailable) packs entirely - nothing to control for them here', async () => {
    setupDom();
    vi.stubGlobal('fetch', mockRoutedFetch());

    await initHomepagePanel();

    const container = document.getElementById('homepage-packs') as HTMLElement;
    expect(container.textContent).not.toContain('Retired Pack');
    expect(container.querySelector('[data-pack-visibility-toggle="retired-pack"]')).toBeNull();
  });

  it('toggling visibility only PATCHes showOnHomepage, nothing else', async () => {
    setupDom();
    const fetchSpy = mockRoutedFetch();
    vi.stubGlobal('fetch', fetchSpy);

    await initHomepagePanel();
    const toggle = document.querySelector('[data-pack-visibility-toggle="her-duo"]') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    await flushAsync();

    const patchCall = fetchSpy.mock.calls.find(([url, opts]) => url.endsWith('/packs/her-duo') && opts?.method === 'PATCH');
    expect(patchCall).toBeTruthy();
    expect(JSON.parse(patchCall![1]!.body as string)).toEqual({ showOnHomepage: false });
  });
});
