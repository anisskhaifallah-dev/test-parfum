// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ORDER = {
  id: 'order-1',
  status: 'pending',
  paymentMethod: 'cod',
  subtotal: 100,
  fullName: 'Test Customer',
  phone: '0600000000',
  line1: '1 Test St',
  line2: null,
  city: 'Casablanca',
  country: 'Morocco',
  notes: null,
  createdAt: new Date(2026, 0, 1).toISOString(),
  items: [{ kind: 'product', productId: 'p1', packId: null, nameSnapshot: 'Test Fragrance', ml: 10, qty: 1, unitPrice: 100 }],
};

// jsdom doesn't provide localStorage unless explicitly configured, and getToken() needs one.
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

function setupDomFromRealStaffHtml(): void {
  const html = readFileSync(join(ROOT, 'staff.html'), 'utf-8');
  const body = html.match(/<body>([\s\S]*)<\/body>/)![1];
  document.body.innerHTML = body;
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function mockRoutedFetch() {
  return vi.fn(async (url: string, opts: RequestInit = {}) => {
    const method = opts.method ?? 'GET';

    if (url.endsWith('/auth/login') && method === 'POST') {
      return { ok: true, json: async () => ({ token: 'fake-token', staff: { id: 's1', email: 'admin@yyparfums.com', name: null, role: 'admin' } }) };
    }
    if (url.endsWith('/products') && method === 'GET') return { ok: true, json: async () => [] };
    if (url.endsWith('/packs') && method === 'GET') return { ok: true, json: async () => [] };
    if (url.endsWith('/orders') && method === 'GET') return { ok: true, json: async () => [ORDER] };
    if (/\/orders\/[^/]+$/.test(url) && method === 'DELETE') return { ok: true, json: async () => ({ ok: true }) };
    // Logging in also lazy-loads the Dashboard tab's analytics, as an unrelated side
    // effect of showDashboard() - not this test file's concern, so just no-op it rather
    // than fail loudly on a request shape this test doesn't otherwise care about.
    if (url.includes('/analytics')) {
      return {
        ok: true,
        json: async () => ({
          range: { from: '', to: '', granularity: 'day' },
          totals: { revenue: 0, orders: 0, avgOrderValue: 0, cancelledCount: 0, cancelledRate: 0 },
          ordersByStatus: [],
          revenueOverTime: [],
          topSellers: [],
          salesByGender: [],
          salesByFamily: [],
          salesBySize: [],
        }),
      };
    }
    throw new Error(`Unhandled request in test: ${method} ${url}`);
  });
}

describe('staff orders: delete', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDomFromRealStaffHtml();
    stubLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function loginAndWaitForOrders(fetchSpy: ReturnType<typeof mockRoutedFetch>) {
    const { initStaffPage } = await import('./staff');
    initStaffPage();

    (document.getElementById('login-email') as HTMLInputElement).value = 'admin@yyparfums.com';
    (document.getElementById('login-password') as HTMLInputElement).value = 'password123';
    document.getElementById('login-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync();
    await flushAsync();

    expect(fetchSpy.mock.calls.some(([u]) => String(u).endsWith('/orders'))).toBe(true);
  }

  it('renders a Delete button per order row', async () => {
    const fetchSpy = mockRoutedFetch();
    vi.stubGlobal('fetch', fetchSpy);

    await loginAndWaitForOrders(fetchSpy);

    const btn = document.querySelector('[data-delete-order="order-1"]');
    expect(btn).toBeTruthy();
  });

  it('deletes the order after confirmation and reloads the list', async () => {
    const fetchSpy = mockRoutedFetch();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('confirm', vi.fn(() => true));

    await loginAndWaitForOrders(fetchSpy);
    fetchSpy.mockClear();

    (document.querySelector('[data-delete-order="order-1"]') as HTMLButtonElement).click();
    await flushAsync();

    const deleteCall = fetchSpy.mock.calls.find(([u, o]) => String(u).endsWith('/orders/order-1') && (o as RequestInit)?.method === 'DELETE');
    expect(deleteCall).toBeTruthy();
    // reloads the orders list afterward
    expect(fetchSpy.mock.calls.some(([u, o]) => String(u).endsWith('/orders') && (o as RequestInit)?.method === undefined)).toBe(true);
  });

  it('does not delete when the confirmation dialog is dismissed', async () => {
    const fetchSpy = mockRoutedFetch();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('confirm', vi.fn(() => false));

    await loginAndWaitForOrders(fetchSpy);
    fetchSpy.mockClear();

    (document.querySelector('[data-delete-order="order-1"]') as HTMLButtonElement).click();
    await flushAsync();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
