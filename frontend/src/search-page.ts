import { searchProducts } from './data/products';
import { renderCard, wireWishlistButtons } from './product-card';
import { t } from './i18n';

function render(query: string) {
  const grid = document.getElementById('search-grid') as HTMLElement;
  const empty = document.getElementById('search-empty') as HTMLElement;
  const count = document.getElementById('search-count') as HTMLElement;

  if (!query.trim()) {
    grid.innerHTML = '';
    count.textContent = '';
    empty.classList.remove('d-none');
    empty.querySelector('p')!.textContent = t('search.prompt');
    return;
  }

  const results = searchProducts(query);
  count.textContent = t(results.length === 1 ? 'search.resultsCountOne' : 'search.resultsCountOther', {
    count: results.length,
    query,
  });

  if (results.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('d-none');
    empty.querySelector('p')!.textContent = t('search.noResults', { query });
  } else {
    empty.classList.add('d-none');
    grid.innerHTML = results.map(renderCard).join('');
    wireWishlistButtons(grid);
  }
}

/** Re-render search results in the newly selected language, without re-wiring the input listener. */
export function rerenderSearchPage(): void {
  const input = document.getElementById('search-input') as HTMLInputElement;
  render(input.value);
}

export function initSearchPage(): void {
  const input = document.getElementById('search-input') as HTMLInputElement;
  const params = new URLSearchParams(location.search);
  const initialQuery = params.get('q') || '';
  input.value = initialQuery;
  render(initialQuery);

  input.addEventListener('input', () => {
    const q = input.value;
    const p = new URLSearchParams(location.search);
    if (q) p.set('q', q);
    else p.delete('q');
    history.replaceState({}, '', `${location.pathname}?${p.toString()}`);
    render(q);
  });
}
