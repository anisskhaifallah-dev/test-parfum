import { getCart, updateCartQty, removeCartLine, clearCart, getCartTotal, lineTotal, type CartLine } from './cart';
import { getProductById, getPackById } from './data/products';
import { apiFetch } from './api';
import { t } from './i18n';
import { escapeHtml } from './escape-html';

interface OrderItemPayload {
  kind: 'product' | 'pack';
  productId?: string;
  packId?: string;
  ml?: number;
  qty: number;
}

function describeLine(line: CartLine): { image: string; name: string; meta: string } | null {
  if (line.kind === 'product') {
    const product = getProductById(line.productId);
    if (!product) return null;
    const size = product.sizes.find((s) => s.ml === line.ml);
    return {
      image: product.image,
      name: escapeHtml(product.name),
      meta: `${escapeHtml(size?.label)} &middot; ${size?.price ?? 0} DH ${t('cart.each')}`,
    };
  }
  const pack = getPackById(line.packId);
  if (!pack) return null;
  return { image: pack.image, name: escapeHtml(pack.name), meta: `${t('cart.packLabel')} &middot; ${pack.price} DH ${t('cart.each')}` };
}

function toOrderItems(lines: CartLine[]): OrderItemPayload[] {
  return lines.map((line) =>
    line.kind === 'product'
      ? { kind: 'product', productId: line.productId, ml: line.ml, qty: line.qty }
      : { kind: 'pack', packId: line.packId, qty: line.qty }
  );
}

function render() {
  const lines = getCart();
  const list = document.getElementById('cart-list') as HTMLElement;
  const empty = document.getElementById('cart-empty') as HTMLElement;
  const subtotal = document.getElementById('cart-subtotal') as HTMLElement;
  const checkoutSection = document.getElementById('checkout-section') as HTMLElement;

  if (lines.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('d-none');
    subtotal.textContent = '0 DH';
    checkoutSection.classList.add('d-none');
    return;
  }
  empty.classList.add('d-none');
  checkoutSection.classList.remove('d-none');

  list.innerHTML = lines
    .map((line, index) => {
      const info = describeLine(line);
      if (!info) return '';
      return `
        <div class="line-item">
          <img src="${info.image}" alt="${info.name}" />
          <div class="line-item-info">
            <p class="fw-bold mb-1">${info.name}</p>
            <p class="text-700 fs--1 mb-2">${info.meta}</p>
            <div class="qty-stepper">
              <button type="button" data-action="dec" data-index="${index}">&minus;</button>
              <span>${line.qty}</span>
              <button type="button" data-action="inc" data-index="${index}">+</button>
            </div>
          </div>
          <div class="text-end">
            <p class="fw-bold mb-2">${lineTotal(line)} DH</p>
            <button type="button" class="btn btn-link text-danger p-0 fs--1" data-action="remove" data-index="${index}">${t('cart.remove')}</button>
          </div>
        </div>
      `;
    })
    .join('');

  subtotal.textContent = `${getCartTotal()} DH`;

  list.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.index);
      const action = btn.dataset.action;
      if (action === 'remove') {
        removeCartLine(index);
      } else {
        const current = getCart()[index];
        const currentQty = current?.qty ?? 0;
        updateCartQty(index, action === 'inc' ? currentQty + 1 : currentQty - 1);
      }
      render();
    });
  });
}

function showCheckoutForm() {
  (document.getElementById('checkout-toggle') as HTMLElement).classList.add('d-none');
  (document.getElementById('checkout-form') as HTMLElement).classList.remove('d-none');
}

async function handleCheckoutSubmit(e: SubmitEvent) {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  const submitBtn = document.getElementById('checkout-submit') as HTMLButtonElement;
  const errorEl = document.getElementById('checkout-error') as HTMLElement;
  errorEl.classList.add('d-none');

  const data = new FormData(form);
  const payload = {
    fullName: String(data.get('fullName') ?? ''),
    phone: String(data.get('phone') ?? ''),
    line1: String(data.get('line1') ?? ''),
    city: 'Youssoufia',
    country: 'Morocco',
    notes: String(data.get('notes') ?? '') || undefined,
    items: toOrderItems(getCart()),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = t('cart.placingOrder');
  try {
    await apiFetch('/orders', { method: 'POST', body: JSON.stringify(payload) });
    clearCart();
    (document.getElementById('checkout-section') as HTMLElement).classList.add('d-none');
    (document.getElementById('checkout-success') as HTMLElement).classList.remove('d-none');
    (document.getElementById('cart-empty') as HTMLElement).classList.add('d-none');
    (document.getElementById('cart-list') as HTMLElement).innerHTML = '';
  } catch (err) {
    errorEl.textContent = err instanceof Error ? err.message : t('cart.genericError');
    errorEl.classList.remove('d-none');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = t('cart.placeOrder');
  }
}

/** Re-render the cart list/subtotal in the newly selected language, without re-wiring the checkout form. */
export function renderCartPage(): void {
  render();
}

export function initCartPage(): void {
  render();
  document.getElementById('checkout-toggle')!.addEventListener('click', showCheckoutForm);
  document.getElementById('checkout-form')!.addEventListener('submit', handleCheckoutSubmit);
}
