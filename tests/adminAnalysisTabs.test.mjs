import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ANALYSIS_TABS,
  getAnalysisRoute,
  normalizeAnalysisTab,
} from '../src/utils/adminAnalysisTabs.js';

test('normalizeAnalysisTab defaults to plants for missing or unknown values', () => {
  assert.equal(normalizeAnalysisTab(), 'plants');
  assert.equal(normalizeAnalysisTab('unknown'), 'plants');
});

test('normalizeAnalysisTab keeps supported tab ids', () => {
  for (const tab of ANALYSIS_TABS) {
    assert.equal(normalizeAnalysisTab(tab.id), tab.id);
  }
});

test('getAnalysisRoute builds the shared analysis page URL for each tab', () => {
  assert.equal(getAnalysisRoute('plants'), '/admin/analysis');
  assert.equal(getAnalysisRoute('orders'), '/admin/analysis?tab=orders');
  assert.equal(getAnalysisRoute('wishlist'), '/admin/analysis?tab=wishlist');
  assert.equal(getAnalysisRoute('cart'), '/admin/analysis?tab=cart');
  assert.equal(getAnalysisRoute('revenue'), '/admin/analysis?tab=revenue');
  assert.equal(getAnalysisRoute('product-demand'), '/admin/analysis?tab=product-demand');
  assert.equal(getAnalysisRoute('users'), '/admin/analysis?tab=users');
  assert.equal(getAnalysisRoute('location'), '/admin/analysis?tab=location');
  assert.equal(getAnalysisRoute('stock-sales'), '/admin/analysis?tab=stock-sales');
  assert.equal(getAnalysisRoute('order-status'), '/admin/analysis?tab=order-status');
  assert.equal(getAnalysisRoute('customer-value'), '/admin/analysis?tab=customer-value');
});

test('removed analysis sections fall back to plant analysis', () => {
  assert.equal(normalizeAnalysisTab('abandoned-cart'), 'plants');
  assert.equal(normalizeAnalysisTab('wishlist-conversion'), 'plants');
  assert.equal(getAnalysisRoute('abandoned-cart'), '/admin/analysis');
  assert.equal(getAnalysisRoute('wishlist-conversion'), '/admin/analysis');
});

test('ANALYSIS_TABS exposes all analysis sections for the shared page', () => {
  assert.deepEqual(
    ANALYSIS_TABS.map((tab) => tab.id),
    [
      'plants',
      'orders',
      'wishlist',
      'cart',
      'revenue',
      'product-demand',
      'users',
      'location',
      'stock-sales',
      'order-status',
      'customer-value',
    ]
  );
});
