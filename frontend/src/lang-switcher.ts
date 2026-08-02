import { getLocale, setLocale, t, type Locale } from './i18n';

// Endonyms are always shown in their own language, regardless of the active locale.
const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
];

function buildSwitcher(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'lang-switcher';
  wrap.id = 'lang-switcher';
  wrap.innerHTML = `
    <button type="button" class="lang-switcher-toggle" aria-haspopup="true" aria-expanded="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      <span class="lang-switcher-code"></span>
    </button>
    <div class="lang-switcher-menu" role="menu">
      ${LANGUAGES.map(
        (l) => `<button type="button" class="lang-switcher-option" data-locale="${l.code}" role="menuitem">${l.label}</button>`
      ).join('')}
    </div>
  `;
  return wrap;
}

function updateActiveState(root: HTMLElement): void {
  const locale = getLocale();
  root.querySelector('.lang-switcher-code')!.textContent = locale.toUpperCase();
  root.querySelectorAll<HTMLButtonElement>('.lang-switcher-option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.locale === locale);
  });
  root.querySelector('.lang-switcher-toggle')!.setAttribute('aria-label', t('switcher.changeLanguage'));
}

/** Wire this into every customer-facing entry point via utils.docReady - never on staff.html. */
export function initLangSwitcher(): void {
  if (document.getElementById('lang-switcher')) return;

  const root = buildSwitcher();
  document.body.appendChild(root);
  updateActiveState(root);

  const toggle = root.querySelector<HTMLButtonElement>('.lang-switcher-toggle')!;
  toggle.addEventListener('click', () => {
    const open = root.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  root.querySelectorAll<HTMLButtonElement>('.lang-switcher-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLocale(btn.dataset.locale as Locale);
      root.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target as Node)) {
      root.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  window.addEventListener('localechange', () => updateActiveState(root));
}
