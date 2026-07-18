import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const productLinkBuilder = await readFile(
  new URL('../functions/scripts/build-product-links.mjs', import.meta.url),
  'utf8',
);

test('backend product links are generated from the integrated root care catalogue', () => {
  assert.doesNotMatch(productLinkBuilder, /plant-care-app/);
  assert.match(productLinkBuilder, /src['"],\s*['"]features['"],\s*['"]plantCare['"],\s*['"]data['"],\s*['"]species\.generated\.json/);
});
