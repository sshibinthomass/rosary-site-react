import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { buildVercelConfig } from '../scripts/vercel-config.mjs';

const rootDir = process.cwd();
const vercelConfig = buildVercelConfig([]);

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
  assert.ok(vercelConfig.redirects.some((entry) => (
    entry.source === '/index.html' && entry.destination === '/' && entry.permanent === true
  )));
  assert.ok(vercelConfig.redirects.some((entry) => (
    entry.source === '/shop.html' && entry.destination === '/shop' && entry.permanent === true
  )));
  assert.ok(vercelConfig.redirects.some((entry) => (
    entry.source === '/(.*)' &&
    entry.destination === 'https://rosaryplanthouse.com/$1' &&
    entry.permanent === true
  )));
  assert.ok(Array.isArray(vercelConfig.rewrites), 'rewrites should be explicit');
});

test('Vercel noindexes private app routes and preserves direct app entry for them', () => {
  const noindexRoutes = new Set(
    vercelConfig.headers
      .filter((entry) => entry.headers.some((header) => header.key === 'X-Robots-Tag' && /noindex/.test(header.value)))
      .map((entry) => entry.source)
  );
  const appShellRoutes = new Set(
    vercelConfig.rewrites
      .filter((entry) => entry.destination === '/index.html')
      .map((entry) => entry.source)
  );

  for (const route of ['/cart', '/wishlist', '/account', '/orders', '/order/(.*)', '/admin', '/admin/(.*)']) {
    assert.ok(noindexRoutes.has(route), `${route} should emit X-Robots-Tag noindex`);
    assert.ok(appShellRoutes.has(route), `${route} should still load the SPA shell directly`);
  }

  for (const route of ['/care', '/care/(.*)']) {
    assert.ok(appShellRoutes.has(route), `${route} should load the SPA shell directly`);
  }
});

test('Vercel leaves unknown paths to the filesystem custom 404 response', () => {
  assert.equal(vercelConfig.rewrites.some((entry) => entry.destination === '/404.html'), false);
  assert.equal(vercelConfig.rewrites.some((entry) => entry.source === '/(.*)'), false);
});

test('SEO artifact generation writes only canonical product directories', () => {
  const generatorSource = readText('scripts/generate-seo-artifacts.js');

  assert.match(generatorSource, /const canonicalPath = getProductPath\(product\)/);
  assert.doesNotMatch(generatorSource, /const legacyPath = `plant\/\$\{product\.id\}`/);
  assert.doesNotMatch(generatorSource, /legacyDir/);
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
  assert.match(homeSource, /const HOME_HERO_IMAGE = '\/home\/hero-natural-nursery-1200\.webp';/);
  assert.match(homeSource, /const HOME_HERO_SEO_IMAGE = '\/home\/hero-natural-nursery\.jpg';/);
  assert.match(homeSource, /const BROWSE_ALL_IMAGE = '\/home\/browse-every-plant-natural-900\.webp';/);
  assert.match(homeSource, /to="\/shop"[\s\S]*className="[^"]*bg-\[var\(--color-forest\)\][^"]*"[\s\S]*Browse every plant/);
  assert.doesNotMatch(homeSource, /Rosette, trailing and compact succulents/);
  assert.doesNotMatch(homeSource, /Plant buyers mention healthy plants and careful packing/);

  for (const asset of [
    'hero-natural-nursery.jpg',
    'hero-natural-nursery-1200.webp',
    'browse-every-plant-natural.jpg',
    'browse-every-plant-natural-900.webp',
    'category-succulent-natural.jpg',
    'category-succulent-natural-360.webp',
    'category-cactus-natural.jpg',
    'category-cactus-natural-360.webp',
    'category-echeveria-natural.jpg',
    'category-echeveria-natural-360.webp',
    'category-jade-natural.jpg',
    'category-jade-natural-360.webp',
    'category-crassula-natural.jpg',
    'category-crassula-natural-360.webp',
    'category-peperomia-natural.jpg',
    'category-peperomia-natural-360.webp',
  ]) {
    assert.ok(fs.existsSync(`${rootDir}/public/home/${asset}`), `public/home/${asset} should exist`);
  }
});

test('homepage hero links to customer reviews beside the primary actions', () => {
  const homeSource = readText('src/pages/HomePage.jsx');
  const heroStart = homeSource.indexOf('<section className="relative overflow-hidden');
  const heroEnd = homeSource.indexOf('</section>', heroStart);
  const heroSource = homeSource.slice(heroStart, heroEnd);

  assert.ok(heroStart >= 0, 'home hero section should be present');
  assert.match(heroSource, /to="\/shop"[\s\S]*Shop all plants/);
  assert.match(heroSource, /to="\/guides"[\s\S]*Care guides/);
  assert.match(heroSource, /to="\/reviews"[\s\S]*Customer reviews/);
});

test('homepage owns broad social proof while shop stays product-first', () => {
  const homeSource = readText('src/pages/HomePage.jsx');
  const shopSource = readText('src/pages/ShopPage.jsx');

  assert.match(homeSource, /Bringing Nature's Finest/);
  assert.match(homeSource, /What Our Customers Say/);
  assert.match(homeSource, /Watch Stories Reviews/);

  assert.match(shopSource, /Shop live plants/);
  assert.match(shopSource, /Search plants by name or category/);
  assert.doesNotMatch(shopSource, /Safe Packaging/);
  assert.doesNotMatch(shopSource, /Transit Replacement/);
  assert.doesNotMatch(shopSource, /Ships Mon & Wed/);
  assert.doesNotMatch(shopSource, /5-Star Rated/);
  assert.doesNotMatch(shopSource, /Bringing Nature's Finest/);
  assert.doesNotMatch(shopSource, /What Our Customers Say/);
  assert.doesNotMatch(shopSource, /Watch Stories Reviews/);
});

test('shop hero links to support, Instagram, and customer reviews', () => {
  const shopSource = readText('src/pages/ShopPage.jsx');

  assert.match(shopSource, /href="https:\/\/wa\.me\/917904050237"[\s\S]*Ask before ordering/);
  assert.match(shopSource, /href="https:\/\/instagram\.com\/rosary_plant_house"[\s\S]*Follow on Instagram/);
  assert.match(shopSource, /to="\/reviews"[\s\S]*Reviews/);
  assert.match(shopSource, /No Pot included until mentioned/);
});

test('category shop pages promote the selected category in the primary heading', () => {
  const shopSource = readText('src/pages/ShopPage.jsx');

  assert.match(shopSource, /const isCategoryPage = selectedCategory !== 'All';/);
  assert.match(shopSource, /aria-label=\{isCategoryPage \? `Shop \$\{selectedCategory\} plants` : 'Shop live plants'\}/);
  assert.match(shopSource, /<strong className="font-extrabold text-\[var\(--color-forest\)\]">\{selectedCategory\}<\/strong>/);
  assert.match(shopSource, /const shopDescription = isCategoryPage/);
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

test('web app manifests launch from the production root domain path', () => {
  for (const filePath of ['public/manifest.json', 'public/site.webmanifest']) {
    const manifest = JSON.parse(readText(filePath));

    assert.equal(manifest.name, 'Rosary Plant House', `${filePath} should use the public app name`);
    assert.equal(manifest.short_name, 'Rosary Plants', `${filePath} should use the short app name`);
    assert.equal(manifest.start_url, '/', `${filePath} should start at the production root`);
    assert.notEqual(manifest.start_url, '/rosary-site-react/');
  }
});

test('site.webmanifest is the canonical linked web app manifest', () => {
  const indexSource = readText('index.html');
  const manifestLinks = indexSource.match(/<link\s+rel="manifest"[^>]+>/g) || [];

  assert.equal(manifestLinks.length, 1);
  assert.match(manifestLinks[0], /href="\/site\.webmanifest"/);
  assert.doesNotMatch(manifestLinks[0], /href="\/manifest\.json"/);
});

test('product pages render related SEO links on the standalone page', () => {
  const productPageSource = readText('src/pages/ProductPage.jsx');
  const relatedLinksSource = readText('src/components/ProductRelatedLinks.jsx');

  assert.match(productPageSource, /import ProductRelatedLinks from '\.\.\/components\/ProductRelatedLinks';/);
  assert.match(productPageSource, /<ProductRelatedLinks product=\{product\} \/>/);
  assert.match(relatedLinksSource, /Related plants/);
  assert.match(relatedLinksSource, /Related care guides/);
  assert.match(relatedLinksSource, /Related problem guides/);
  assert.match(relatedLinksSource, /Related products/);
});

test('product cards expose semantic product links without wrapping purchase controls', () => {
  const productCardSource = readText('src/components/ProductCard.jsx');

  assert.match(productCardSource, /import \{ Link, useLocation \} from 'react-router-dom';/);
  assert.match(productCardSource, /const productPath = getProductPath/);
  assert.match(productCardSource, /<Link[\s\S]*to=\{productPath\}/);
  assert.doesNotMatch(productCardSource, /onClick=\{\(\) => navigate\(getProductPath/);
  assert.match(productCardSource, /<button[\s\S]*onClick=\{handleAddToCart\}/);
});

test('mobile drawer uses inline icons instead of emoji menu markers', () => {
  const layoutSource = readText('src/components/Layout.jsx');
  const oldEmojiMarkers = [
    [0x1f33f],
    [0x2b50],
    [0x1f5c2, 0xfe0f],
    [0x1f3e0],
    [0x1fab4],
    [0x1f335],
    [0x1f338],
    [0x1f48e],
    [0x1f340],
    [0x1f331],
    [0x1fabb],
    [0x1f33e],
    [0x1f343],
    [0x1f40d],
    [0x1f3e1],
    [0x1f38b],
    [0x1f333],
    [0x1f381],
    [0x1f4e6],
    [0x1f4f8],
    [0x2753],
    [0x2139, 0xfe0f],
    [0x1f4de],
  ].map((codePoints) => String.fromCodePoint(...codePoints));

  assert.match(layoutSource, /function MenuGlyph/);
  assert.match(layoutSource, /const categoryIconTypes = Object\.freeze/);
  assert.match(layoutSource, /const infoNavItems = \[/);
  for (const marker of oldEmojiMarkers) {
    assert.equal(layoutSource.includes(marker), false, `Layout should not render ${marker} emoji menu markers`);
  }
});
