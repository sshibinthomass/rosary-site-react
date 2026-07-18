import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLegacyProductRedirects,
  buildVercelConfig,
} from '../scripts/vercel-config.mjs';

const publishedProduct = {
  id: '1',
  available: true,
  identityVerified: true,
  seoStatus: 'published',
  title: 'Sempervivum tectorum',
  seo: { slug: 'sempervivum-tectorum-1' },
};

test('legacy product URLs permanently redirect to shared canonical paths', () => {
  assert.deepEqual(buildLegacyProductRedirects([publishedProduct]), [{
    source: '/plant/1',
    destination: '/plant/1-sempervivum-tectorum/',
    permanent: true,
  }]);
});

test('legacy redirects exclude products that are intentionally not indexable', () => {
  const draft = { ...publishedProduct, id: '2', seoStatus: 'draft' };
  assert.deepEqual(buildLegacyProductRedirects([draft]), []);
});

test('legacy redirect generation rejects invalid and duplicate catalog IDs', () => {
  assert.throws(() => buildLegacyProductRedirects(null), /array/i);
  assert.throws(
    () => buildLegacyProductRedirects([{ ...publishedProduct, id: '' }]),
    /product id/i
  );
  assert.throws(
    () => buildLegacyProductRedirects([publishedProduct, { ...publishedProduct }]),
    /duplicate legacy product route/i
  );
});

test('Vercel config redirects legacy pages and preserves private route exclusions', () => {
  const config = buildVercelConfig([publishedProduct]);
  const redirects = new Map(config.redirects.map((entry) => [entry.source, entry]));
  const noindexSources = new Set(
    config.headers
      .filter((entry) => entry.headers.some((header) => (
        header.key === 'X-Robots-Tag' && header.value === 'noindex, nofollow'
      )))
      .map((entry) => entry.source)
  );

  for (const [source, destination] of [
    ['/index.html', '/'],
    ['/shop.html', '/shop'],
    ['/faq.html', '/faq'],
    ['/cart.html', '/cart'],
    ['/admin/orders.html', '/admin/orders'],
  ]) {
    assert.deepEqual(redirects.get(source), { source, destination, permanent: true });
  }

  assert.deepEqual(redirects.get('/plant/1'), {
    source: '/plant/1',
    destination: '/plant/1-sempervivum-tectorum/',
    permanent: true,
  });

  for (const source of ['/cart', '/wishlist', '/account', '/orders', '/order/(.*)', '/admin', '/admin/(.*)']) {
    assert.ok(noindexSources.has(source), `${source} should remain noindex`);
  }
});

test('Vercel config rewrites only supported SPA routes and has no soft-404 catch-all', () => {
  const config = buildVercelConfig([publishedProduct]);
  const rewrites = new Map(config.rewrites.map((entry) => [entry.source, entry.destination]));

  for (const source of [
    '/cart', '/wishlist', '/account', '/orders', '/order/(.*)',
    '/admin', '/admin/(.*)', '/care', '/care/(.*)',
  ]) {
    assert.equal(rewrites.get(source), '/index.html');
  }

  assert.equal(rewrites.has('/(.*)'), false);
  assert.equal(config.rewrites.some((entry) => entry.destination === '/404.html'), false);
});
