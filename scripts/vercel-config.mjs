import { getProductPath, isSeoIndexable } from '../src/utils/productSeo.js';

const PRIVATE_ROUTES = [
  '/cart',
  '/wishlist',
  '/account',
  '/orders',
  '/order/(.*)',
  '/admin',
  '/admin/(.*)',
];

const HTML_REDIRECTS = [
  ['/index.html', '/'],
  ['/shop.html', '/shop'],
  ['/faq.html', '/faq'],
  ['/policies.html', '/policies'],
  ['/contact.html', '/contact'],
  ['/about.html', '/about'],
  ['/reviews.html', '/reviews'],
  ['/insta-reviews.html', '/insta-reviews'],
  ['/guides.html', '/guides'],
  ['/cart.html', '/cart'],
  ['/wishlist.html', '/wishlist'],
  ['/account.html', '/account'],
  ['/orders.html', '/orders'],
  ['/admin.html', '/admin'],
  ['/admin/users.html', '/admin/users'],
  ['/admin/orders.html', '/admin/orders'],
  ['/admin/orders/new.html', '/admin/orders/new'],
  ['/admin/products.html', '/admin/products'],
  ['/admin/limited.html', '/admin/limited'],
  ['/admin/export.html', '/admin/export'],
  ['/admin/analysis.html', '/admin/analysis'],
  ['/admin/plant-analysis.html', '/admin/plant-analysis'],
  ['/admin/order-analysis.html', '/admin/order-analysis'],
];

export function buildLegacyProductRedirects(products) {
  if (!Array.isArray(products)) throw new TypeError('Product catalog must be an array.');

  const seenSources = new Set();
  const redirects = [];

  for (const product of products) {
    const id = String(product?.id || '').trim();
    if (!id) throw new Error('Every catalog entry must have a product ID.');
    if (!isSeoIndexable(product)) continue;

    const source = `/plant/${id}`;
    if (seenSources.has(source)) {
      throw new Error(`Duplicate legacy product route: ${source}`);
    }
    seenSources.add(source);

    const destination = getProductPath(product);
    if (source === destination || `${source}/` === destination) continue;

    redirects.push({ source, destination, permanent: true });
  }

  return redirects;
}

export function buildVercelConfig(products) {
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    git: { deploymentEnabled: { 'gh-pages': false } },
    headers: [
      {
        source: '/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/sale_plants/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      ...PRIVATE_ROUTES.map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ],
    redirects: [
      {
        source: '/(.*)',
        has: [{ type: 'host', value: 'www.rosaryplanthouse.com' }],
        destination: 'https://rosaryplanthouse.com/$1',
        permanent: true,
      },
      ...HTML_REDIRECTS.map(([source, destination]) => ({ source, destination, permanent: true })),
      ...buildLegacyProductRedirects(products),
    ],
    rewrites: [
      ...PRIVATE_ROUTES.map((source) => ({ source, destination: '/index.html' })),
    ],
  };
}
