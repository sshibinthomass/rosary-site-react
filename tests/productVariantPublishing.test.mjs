import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const productPageSource = fs.readFileSync(new URL('../src/pages/ProductPage.jsx', import.meta.url), 'utf8');
const productCardSource = fs.readFileSync(new URL('../src/components/ProductCard.jsx', import.meta.url), 'utf8');
const generatorSource = fs.readFileSync(new URL('../scripts/generate-seo-artifacts.js', import.meta.url), 'utf8');

test('browser product surfaces use the shared variety and size identity helpers', () => {
  assert.match(productPageSource, /getProductDisplayName/);
  assert.match(productPageSource, /getProductVariantSummary/);
  assert.match(productPageSource, /const title = product \? getProductDisplayName\(product\) : ''/);
  assert.match(productPageSource, /getProductVariantSummary\(product\)/);
  assert.match(productCardSource, /getProductDisplayName/);
  assert.match(productCardSource, /const name = getProductDisplayName\(product\)/);
});

test('production SEO generation rejects authoritative duplicate product identities', () => {
  assert.match(generatorSource, /findDuplicateProductSeoIdentities/);
  assert.match(generatorSource, /firebaseProducts\.length > 0/);
  assert.match(generatorSource, /Duplicate product SEO identities/);
});
