import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  getProductRobots,
  getSeoReviewSeed,
  getSeoStatus,
  isIdentityVerified,
  isSeoIndexable,
} from '../src/utils/seoPolicy.js';

const dataFiles = [
  'src/data/products.json',
  'scripts/products.json',
  'public/product-seo-index.json',
];

test('isSeoIndexable requires availability, verified identity, and published SEO status', () => {
  assert.equal(isSeoIndexable({
    id: '1',
    available: true,
    seoStatus: 'published',
    identityVerified: true,
  }), true);

  assert.equal(isSeoIndexable({
    id: '1',
    available: true,
    seoStatus: 'needs_review',
    identityVerified: true,
  }), false);

  assert.equal(isSeoIndexable({
    id: '1',
    available: true,
    seoStatus: 'published',
    identityVerified: false,
  }), false);

  assert.equal(isSeoIndexable({
    id: '1',
    available: false,
    seoStatus: 'published',
    identityVerified: true,
  }), false);
});

test('getSeoStatus defaults future rows without explicit status to needs_review', () => {
  assert.equal(getSeoStatus({ id: 'new-row' }), 'needs_review');
  assert.equal(getSeoStatus({ id: '1', seoStatus: 'approved' }), 'approved');
  assert.equal(getSeoStatus({ id: '1', seo: { status: 'published' } }), 'published');
  assert.equal(getSeoStatus({ id: '1', seoStatus: 'bad-value' }), 'needs_review');
});

test('isIdentityVerified accepts only explicit verification', () => {
  assert.equal(isIdentityVerified({ identityVerified: true }), true);
  assert.equal(isIdentityVerified({ identityVerified: false }), false);
  assert.equal(isIdentityVerified({ identity: { verified: true } }), true);
  assert.equal(isIdentityVerified({ identity: { verified: false } }), false);
  assert.equal(isIdentityVerified({ id: '1' }), false);
});

test('getProductRobots indexes approved pages and keeps review pages discoverable', () => {
  assert.equal(getProductRobots({
    id: '1',
    available: true,
    seoStatus: 'approved',
    identityVerified: true,
  }), 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');

  assert.equal(getProductRobots({
    id: '2',
    available: true,
    seoStatus: 'needs_review',
    identityVerified: false,
  }), 'noindex,follow');
});

test('getSeoReviewSeed starts future products in human review', () => {
  assert.deepEqual(getSeoReviewSeed(), {
    seoStatus: 'needs_review',
    identityVerified: false,
    seoReviewReason: 'Plant has not been reviewed for SEO publishing.',
  });
});

test('all current local SEO product rows are already marked verified and published', () => {
  for (const filePath of dataFiles) {
    const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const unverified = products
      .filter((product) => product.seoStatus !== 'published' || product.identityVerified !== true)
      .map((product) => product.id);

    assert.deepEqual(unverified, [], `${filePath} has unverified current products`);
  }
});
