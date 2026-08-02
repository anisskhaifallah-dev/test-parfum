import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CUSTOMER_PAGES = [
  'index.html',
  'product.html',
  'cart.html',
  'wishlist.html',
  'search.html',
  'packs.html',
  'for-him.html',
  'for-her.html',
];

describe('robots.txt', () => {
  const robots = readFileSync(join(ROOT, 'public/robots.txt'), 'utf-8');

  it('disallows the staff dashboard', () => {
    expect(robots).toMatch(/Disallow:\s*\/staff\.html/);
  });

  it('points to the sitemap', () => {
    expect(robots).toMatch(/Sitemap:\s*https:\/\/yyparfum\.com\/sitemap\.xml/);
  });
});

describe('sitemap.xml', () => {
  const sitemap = readFileSync(join(ROOT, 'public/sitemap.xml'), 'utf-8');

  it('is well-formed enough to list <url><loc> entries', () => {
    const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    locs.forEach((loc) => expect(loc).toMatch(/^https:\/\/yyparfum\.com\//));
  });

  it('does not list the staff dashboard or the parameterized product page', () => {
    expect(sitemap).not.toContain('staff.html');
    expect(sitemap).not.toContain('product.html');
  });
});

describe('per-page SEO meta tags', () => {
  it.each(CUSTOMER_PAGES)('%s has a description and Open Graph tags', (page) => {
    const html = readFileSync(join(ROOT, page), 'utf-8');
    expect(html).toMatch(/<meta name="description" content="[^"]+"/);
    expect(html).toMatch(/<meta property="og:title" content="[^"]+"/);
    expect(html).toMatch(/<meta property="og:description" content="[^"]+"/);
    expect(html).toMatch(/<meta property="og:image" content="https:\/\/yyparfum\.com\/[^"]+"/);
  });

  it('staff.html is excluded from indexing', () => {
    const html = readFileSync(join(ROOT, 'staff.html'), 'utf-8');
    expect(html).toMatch(/<meta name="robots" content="noindex, ?nofollow"/);
  });
});
