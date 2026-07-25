import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getStorefrontProductTitle,
  withStorefrontProductTitle,
} from '../src/utils/productPresentation.js';

test('storefront product title prefers title and appends the offered size', () => {
  assert.equal(getStorefrontProductTitle({
    title: 'Sempervivum tectorum',
    commonName: 'Red tip',
    name: 'Red tip',
    size: '(1.5"-2")',
  }), 'Sempervivum tectorum – (1.5"-2")');
});

test('storefront product title does not append a size already in the title', () => {
  assert.equal(getStorefrontProductTitle({
    title: 'Haworthia cooperi Large Cluster',
    commonName: 'Stone',
    size: 'Large Cluster',
  }), 'Haworthia cooperi Large Cluster');
});

test('storefront product title uses approved legacy fallbacks', () => {
  assert.equal(getStorefrontProductTitle({ commonName: 'Red tip' }), 'Red tip');
  assert.equal(getStorefrontProductTitle({ name: 'Legacy plant' }), 'Legacy plant');
  assert.equal(getStorefrontProductTitle({}), 'Plant');
  assert.equal(getStorefrontProductTitle(null), 'Plant');
});

test('storefront product title ignores blank identity fields and normalizes whitespace', () => {
  assert.equal(getStorefrontProductTitle({
    title: '   ',
    commonName: '  Yellow   Flower ',
    name: 'Legacy',
    size: '  Small  ',
  }), 'Yellow Flower – Small');
});

test('storefront product snapshots replace a legacy name without mutating the source product', () => {
  const product = {
    id: '1',
    title: 'Sempervivum tectorum',
    commonName: 'Red tip',
    name: 'Red tip',
    size: 'Small',
  };

  const snapshot = withStorefrontProductTitle(product);

  assert.deepEqual(snapshot, {
    ...product,
    name: 'Sempervivum tectorum – Small',
  });
  assert.equal(product.name, 'Red tip');
});
