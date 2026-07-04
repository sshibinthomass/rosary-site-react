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
  assert.deepEqual(config.rewrites, [
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ]);
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
  assertCanonical('src/pages/ContactPage.jsx', 'https://rosaryplanthouse.com/contact');
  assertCanonical('src/pages/ReviewsPage.jsx', 'https://rosaryplanthouse.com/reviews');
  assertCanonical('src/pages/InstaReviewsPage.jsx', 'https://rosaryplanthouse.com/insta-reviews');
});
