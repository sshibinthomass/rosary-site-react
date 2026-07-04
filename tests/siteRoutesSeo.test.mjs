import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const rootDir = process.cwd();

function readText(path) {
  return fs.readFileSync(`${rootDir}/${path}`, 'utf8');
}

function assertCanonical(path, canonicalUrl) {
  const source = readText(path);
  assert.match(
    source,
    new RegExp(`canonicalUrl=["']${canonicalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`),
    `${path} should set canonicalUrl="${canonicalUrl}"`
  );
}

test('Vercel redirects duplicate host and index.html to canonical URLs before SPA rewrites', () => {
  const rawConfig = readText('vercel.json');
  const config = JSON.parse(rawConfig);

  assert.ok(
    rawConfig.indexOf('"redirects"') > -1 && rawConfig.indexOf('"redirects"') < rawConfig.indexOf('"rewrites"'),
    'redirects should be declared before rewrites'
  );
  assert.deepEqual(config.redirects, [
    {
      source: '/(.*)',
      has: [
        {
          type: 'host',
          value: 'www.rosaryplanthouse.com',
        },
      ],
      destination: 'https://rosaryplanthouse.com/$1',
      permanent: true,
    },
    {
      source: '/index.html',
      destination: '/',
      permanent: true,
    },
  ]);
  assert.ok(Array.isArray(config.rewrites), 'rewrites should be explicit');
  assert.deepEqual(config.rewrites.at(-1), {
    source: '/(.*)',
    destination: '/404.html',
  });
});

test('Vercel noindexes private app routes and preserves direct app entry for them', () => {
  const config = JSON.parse(readText('vercel.json'));
  const noindexRoutes = new Set(
    config.headers
      .filter((entry) => entry.headers.some((header) => header.key === 'X-Robots-Tag' && /noindex/.test(header.value)))
      .map((entry) => entry.source)
  );
  const appShellRoutes = new Set(
    config.rewrites
      .filter((entry) => entry.destination === '/index.html')
      .map((entry) => entry.source)
  );

  for (const route of ['/cart', '/wishlist', '/account', '/orders', '/order/(.*)', '/admin', '/admin/(.*)']) {
    assert.ok(noindexRoutes.has(route), `${route} should emit X-Robots-Tag noindex`);
    assert.ok(appShellRoutes.has(route), `${route} should still load the SPA shell directly`);
  }
});

test('Vercel sends invalid product, category, and guide paths to the noindex 404 artifact', () => {
  const config = JSON.parse(readText('vercel.json'));
  const fallbackRoutes = config.rewrites.filter((entry) => entry.destination === '/404.html');

  assert.ok(fallbackRoutes.some((entry) => entry.source === '/plant/(.*)'), 'invalid plant paths should use 404.html');
  assert.ok(fallbackRoutes.some((entry) => entry.source === '/category/(.*)'), 'invalid category paths should use 404.html');
  assert.ok(fallbackRoutes.some((entry) => entry.source === '/guides/(.*)'), 'invalid guide paths should use 404.html');
});

test('unknown client routes render the noindex not-found page instead of redirecting home', () => {
  const appSource = readText('src/App.jsx');

  assert.match(appSource, /const NotFoundPage = lazy\(\(\) => import\('\.\/pages\/NotFoundPage'\)\);/);
  assert.match(appSource, /<Route path="\*" element={<NotFoundPage \/>} \/>/);
  assert.doesNotMatch(appSource, /<Route path="\*" element={<Navigate to="\/" replace \/>} \/>/);
});

test('public information pages declare their canonical URLs', () => {
  assertCanonical('src/pages/HomePage.jsx', 'https://rosaryplanthouse.com/');
  assertCanonical('src/pages/AboutPage.jsx', 'https://rosaryplanthouse.com/about');
  assertCanonical('src/pages/FAQPage.jsx', 'https://rosaryplanthouse.com/faq');
  assertCanonical('src/pages/PoliciesPage.jsx', 'https://rosaryplanthouse.com/policies');
  assertCanonical('src/pages/ContactPage.jsx', 'https://rosaryplanthouse.com/contact');
  assertCanonical('src/pages/ReviewsPage.jsx', 'https://rosaryplanthouse.com/reviews');
  assertCanonical('src/pages/InstaReviewsPage.jsx', 'https://rosaryplanthouse.com/insta-reviews');

  const shopSource = readText('src/pages/ShopPage.jsx');
  assert.match(shopSource, /https:\/\/rosaryplanthouse\.com\/shop/);
  assert.match(shopSource, /canonicalUrl=\{shopCanonicalUrl\}/);
});

test('shop catalogue is routed separately from the landing homepage', () => {
  const appSource = readText('src/App.jsx');
  const layoutSource = readText('src/components/Layout.jsx');
  const footerSource = readText('src/components/Footer.jsx');

  assert.match(appSource, /import HomePage from '\.\/pages\/HomePage';/);
  assert.match(appSource, /const ShopPage = lazy\(\(\) => import\('\.\/pages\/ShopPage'\)\);/);
  assert.match(appSource, /<Route path="\/" element={<HomePage \/>} \/>/);
  assert.match(appSource, /<Route path="\/shop" element={<ShopPage \/>} \/>/);
  assert.match(appSource, /<Route path="\/shop\.html" element={<ShopPage \/>} \/>/);
  assert.match(appSource, /<Route path="\/category\/:categoryName" element={<ShopPage \/>} \/>/);
  assert.match(layoutSource, /\{ path: '\/shop', label: 'Shop'/);
  assert.match(footerSource, /\{ label: 'Shop', path: '\/shop' \}/);
});

test('homepage keeps the landing content compact and highlights shopping entry points', () => {
  const homeSource = readText('src/pages/HomePage.jsx');

  assert.match(homeSource, /const featuredCategories = CATEGORIES\.slice\(0, 6\);/);
  assert.match(homeSource, /const CATEGORY_IMAGES = Object\.freeze/);
  assert.match(homeSource, /const HOME_HERO_IMAGE = '\/home\/hero-natural-nursery\.jpg';/);
  assert.match(homeSource, /const BROWSE_ALL_IMAGE = '\/home\/browse-every-plant-natural\.jpg';/);
  assert.match(homeSource, /to="\/shop"[\s\S]*className="[^"]*bg-\[var\(--color-forest\)\][^"]*"[\s\S]*Browse every plant/);
  assert.doesNotMatch(homeSource, /Rosette, trailing and compact succulents/);
  assert.doesNotMatch(homeSource, /Plant buyers mention healthy plants and careful packing/);

  for (const asset of [
    'hero-natural-nursery.jpg',
    'browse-every-plant-natural.jpg',
    'category-succulent-natural.jpg',
    'category-cactus-natural.jpg',
    'category-echeveria-natural.jpg',
    'category-jade-natural.jpg',
    'category-crassula-natural.jpg',
    'category-peperomia-natural.jpg',
  ]) {
    assert.ok(fs.existsSync(`${rootDir}/public/home/${asset}`), `public/home/${asset} should exist`);
  }
});

test('policies page is routed and discoverable from public navigation', () => {
  const appSource = readText('src/App.jsx');
  const footerSource = readText('src/components/Footer.jsx');
  const layoutSource = readText('src/components/Layout.jsx');

  assert.match(appSource, /const PoliciesPage = lazy\(\(\) => import\('\.\/pages\/PoliciesPage'\)\);/);
  assert.match(appSource, /<Route path="\/policies" element={<PoliciesPage \/>} \/>/);
  assert.match(appSource, /<Route path="\/policies\.html" element={<PoliciesPage \/>} \/>/);
  assert.match(footerSource, /\{ label: 'Policies', path: '\/policies' \}/);
  assert.match(layoutSource, /\{ path: '\/policies', label: 'Policies'/);
});

test('content hub guide pages are routed for hydration', () => {
  const appSource = readText('src/App.jsx');

  assert.match(appSource, /const GuidesPage = lazy\(\(\) => import\('\.\/pages\/GuidesPage'\)\);/);
  assert.match(appSource, /<Route path="\/guides" element={<GuidesPage \/>} \/>/);
  assert.match(appSource, /<Route path="\/guides\.html" element={<GuidesPage \/>} \/>/);
  assert.match(appSource, /const ContentHubPage = lazy\(\(\) => import\('\.\/pages\/ContentHubPage'\)\);/);
  assert.match(appSource, /<Route path="\/guides\/:hubSlug" element={<ContentHubPage \/>} \/>/);
});

test('care guide navigation points to the guide library index', () => {
  const footerSource = readText('src/components/Footer.jsx');
  const layoutSource = readText('src/components/Layout.jsx');

  assert.match(footerSource, /\{ label: 'Care Guides', path: '\/guides' \}/);
  assert.match(layoutSource, /\{ path: '\/guides', label: 'Care Guides'/);
  assert.doesNotMatch(footerSource, /Care Guides', path: '\/guides\/succulents-in-india'/);
  assert.doesNotMatch(layoutSource, /path: '\/guides\/succulents-in-india', label: 'Care Guides'/);
});
