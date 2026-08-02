// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initNewsletter } from './newsletter';
import { setLocale } from './i18n';

function setupDom() {
  document.body.innerHTML = `
    <form id="newsletter-form">
      <input id="newsletter-email" type="email" />
    </form>
    <div id="newsletter-status" class="d-none"></div>
  `;
}

function submitForm() {
  const form = document.getElementById('newsletter-form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

// Two macrotask flushes: one for the fetch() promise, one for the res.json() promise
// inside apiFetch - handleSubmit's own awaits chain through both before touching the DOM.
async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('newsletter signup', () => {
  beforeEach(() => {
    setLocale('en'); // pin the language so assertions below don't depend on whatever the default happens to be
    setupDom();
    initNewsletter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects an invalid email without calling the API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    (document.getElementById('newsletter-email') as HTMLInputElement).value = 'not-an-email';

    submitForm();
    await flushAsync();

    expect(fetchSpy).not.toHaveBeenCalled();
    const status = document.getElementById('newsletter-status') as HTMLElement;
    expect(status.classList.contains('d-none')).toBe(false);
    expect(status.textContent).toBe('Please enter a valid email address.');
  });

  it('submits a valid email to the API, shows success, and clears the input', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchSpy);
    const input = document.getElementById('newsletter-email') as HTMLInputElement;
    input.value = 'customer@example.com';

    submitForm();
    await flushAsync();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/newsletter$/);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ email: 'customer@example.com' });

    const status = document.getElementById('newsletter-status') as HTMLElement;
    expect(status.textContent).toBe('Thanks for subscribing!');
    expect(input.value).toBe('');
  });

  it('shows the backend error message when the API rejects the request', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'A valid email is required' }) });
    vi.stubGlobal('fetch', fetchSpy);
    (document.getElementById('newsletter-email') as HTMLInputElement).value = 'weird@example.com';

    submitForm();
    await flushAsync();

    const status = document.getElementById('newsletter-status') as HTMLElement;
    expect(status.textContent).toBe('A valid email is required');
    expect(status.classList.contains('text-danger')).toBe(true);
  });
});
