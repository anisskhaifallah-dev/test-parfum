import { addPackToCart } from './cart';
import { t } from './i18n';

export function wirePackButtons(container: ParentNode = document): void {
  container.querySelectorAll<HTMLButtonElement>('[data-add-pack]').forEach((btn) => {
    btn.addEventListener('click', () => {
      addPackToCart(btn.dataset.addPack as string);
      const original = btn.textContent;
      btn.textContent = t('product.added');
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1500);
    });
  });
}
