import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { buildMerchantFeedTsv } from '../scripts/seo/artifacts.mjs';

const rootDir = path.resolve('.');

test('global SEO image assets exist for social previews and schema fallbacks', () => {
  for (const assetPath of [
    'public/og-image.jpg',
    'public/hero-bg.jpg',
    'public/placeholder-plant.jpg',
  ]) {
    assert.equal(fs.existsSync(path.join(rootDir, assetPath)), true, `${assetPath} is missing`);
  }
});

test('merchant feed uses public product image URLs without the Vite public prefix', () => {
  const feed = buildMerchantFeedTsv([{
    id: '1',
    title: 'Sempervivum tectorum',
    available: true,
    seoStatus: 'published',
    identityVerified: true,
    imageUrl: 'public/sale_plants/1.jpg',
    salesPrice: 69,
  }], { baseUrl: 'https://rosaryplanthouse.com' });

  assert.match(feed, /https:\/\/rosaryplanthouse\.com\/sale_plants\/1\.jpg/);
  assert.doesNotMatch(feed, /https:\/\/rosaryplanthouse\.com\/public\/sale_plants\/1\.jpg/);
});

test('image audit script verifies required SEO image assets', async () => {
  const scriptPath = path.join(rootDir, 'scripts/seo/image-audit.mjs');
  assert.equal(fs.existsSync(scriptPath), true, 'scripts/seo/image-audit.mjs is missing');

  const { auditImageSeo } = await import(pathToFileURL(scriptPath));
  const report = await auditImageSeo({ rootDir });

  assert.deepEqual(report.errors, []);
  assert.ok(report.checkedAssets.includes('public/og-image.jpg'));
  assert.ok(report.checkedAssets.includes('public/hero-bg.jpg'));
  assert.ok(report.checkedAssets.includes('public/placeholder-plant.jpg'));
});

test('package and Vercel expose image SEO verification and cache product images', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['seo:image-audit'], 'node scripts/seo/image-audit.mjs');
  assert.match(packageJson.scripts.prebuild, /seo:image-audit/);

  const vercelConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'));
  const salePlantHeader = vercelConfig.headers.find((entry) => entry.source === '/sale_plants/(.*)');
  assert.ok(salePlantHeader, 'missing /sale_plants cache header');
  assert.deepEqual(salePlantHeader.headers, [{
    key: 'Cache-Control',
    value: 'public, max-age=31536000, immutable',
  }]);
});
