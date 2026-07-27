import { addPackToCart } from './cart';

export function wirePackButtons(container: ParentNode = document): void {
  container.querySelectorAll<HTMLButtonElement>('[data-add-pack]').forEach((btn) => {
    btn.addEventListener('click', () => {
      addPackToCart(btn.dataset.addPack as string);
      const original = btn.textContent;
      btn.textContent = 'Added!';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1500);
    });
  });
}
