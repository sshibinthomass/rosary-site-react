import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRODUCT_CACHE_PREFIX,
  clearProductCacheStorage,
  readProductCache,
  writeProductCache,
} from '../src/utils/productCache.js';

function createStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
    keys() {
      return Array.from(map.keys());
    },
  };
}

test('product cache read returns fresh arrays and drops expired entries', () => {
  const storage = createStorage();
  writeProductCache(storage, 'All', [{ id: '1', price: 100 }], 1000);

  assert.deepEqual(readProductCache(storage, 'All', 1000 + 60_000), [{ id: '1', price: 100 }]);
  assert.equal(readProductCache(storage, 'All', 1000 + 20 * 60_000), null);
  assert.equal(storage.getItem(`${PRODUCT_CACHE_PREFIX}All`), null);
});

test('clearing product cache preserves unrelated local storage keys', () => {
  const storage = createStorage({
    [`${PRODUCT_CACHE_PREFIX}All`]: JSON.stringify({ timestamp: 1, data: [] }),
    [`${PRODUCT_CACHE_PREFIX}Succulent`]: JSON.stringify({ timestamp: 1, data: [] }),
    rosary_guest_cart: '[]',
  });

  clearProductCacheStorage(storage);

  assert.deepEqual(storage.keys(), ['rosary_guest_cart']);
});
