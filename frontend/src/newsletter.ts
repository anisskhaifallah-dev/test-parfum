import { apiFetch } from './api';
import { t } from './i18n';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  const input = form.querySelector<HTMLInputElement>('#newsletter-email');
  const status = document.getElementById('newsletter-status');
  if (!input || !status) return;

  const email = input.value.trim();
  status.classList.remove('d-none', 'text-danger', 'text-success');

  if (!EMAIL_RE.test(email)) {
    status.textContent = t('newsletter.invalidEmail');
    status.classList.add('text-danger');
    return;
  }

  status.textContent = t('newsletter.submitting');

  try {
    await apiFetch('/newsletter', { method: 'POST', body: JSON.stringify({ email }) });
    status.textContent = t('newsletter.success');
    status.classList.add('text-success');
    input.value = '';
  } catch (err) {
    status.textContent = err instanceof Error ? err.message : t('newsletter.error');
    status.classList.add('text-danger');
  }
}

/** Wire this into every customer-facing entry point via utils.docReady - never on staff.html. */
export function initNewsletter(): void {
  document.getElementById('newsletter-form')?.addEventListener('submit', handleSubmit);
}
