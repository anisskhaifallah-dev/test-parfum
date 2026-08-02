import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('escapes all HTML-significant characters', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('neutralizes a script-tag XSS payload', () => {
    const payload = '<script>alert(1)</script>';
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('neutralizes an attribute-breakout payload (the staff-dashboard order-notes case)', () => {
    const payload = '"><img src=x onerror=fetch(String.fromCharCode(47,47,101,118,105,108))>';
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain('"><img');
    expect(escaped.startsWith('&quot;&gt;&lt;img')).toBe(true);
  });

  it('leaves ordinary text unchanged', () => {
    expect(escapeHtml('Chergui 10ml Decant')).toBe('Chergui 10ml Decant');
  });

  it('treats null/undefined as an empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
