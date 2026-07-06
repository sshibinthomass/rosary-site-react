import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CATALOG_REFRESH_EVENT,
  createCatalogRefreshEvent,
  getRefreshReasonsForAppState,
} from '../src/utils/catalogRefresh.js';

test('catalog refresh is requested when the Android app opens or resumes', () => {
  assert.deepEqual(getRefreshReasonsForAppState({ isActive: true }), ['app-active']);
  assert.deepEqual(getRefreshReasonsForAppState({ isActive: false }), []);
  assert.deepEqual(getRefreshReasonsForAppState(null), []);
});

test('catalog refresh event carries a stable event name and reason', () => {
  const event = createCatalogRefreshEvent('app-active');

  assert.equal(event.type, CATALOG_REFRESH_EVENT);
  assert.equal(event.detail.reason, 'app-active');
});
