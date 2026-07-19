import assert from 'node:assert/strict';
import test from 'node:test';

import { checkForServiceWorkerRelease } from '../src/utils/serviceWorkerRelease.js';

function createHarness(initialSource = 'release-a') {
  let source = initialSource;
  const registrations = [];
  const stored = new Map();
  const serviceWorker = {
    controller: null,
    async register(url) {
      registrations.push(url);
      serviceWorker.controller = {};
      return { scope: '/' };
    },
  };

  return {
    registrations,
    serviceWorker,
    storage: {
      getItem: key => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
    },
    fetcher: async (_url, options) => {
      assert.equal(options.cache, 'no-store');
      return { ok: true, text: async () => source };
    },
    digestSource: async value => `hash-${value}`,
    setSource(value) {
      source = value;
    },
  };
}

test('the same service-worker release registers only once across page reloads', async () => {
  const harness = createHarness();
  const options = {
    serviceWorker: harness.serviceWorker,
    storage: harness.storage,
    fetcher: harness.fetcher,
    digestSource: harness.digestSource,
    now: () => 123,
  };

  const first = await checkForServiceWorkerRelease(options);
  const second = await checkForServiceWorkerRelease(options);

  assert.equal(first.updated, true);
  assert.equal(second.updated, false);
  assert.deepEqual(harness.registrations, ['/sw.js?release=hash-release-a']);
});

test('a changed service-worker release bypasses caches and registers a new URL', async () => {
  const harness = createHarness();
  const options = {
    serviceWorker: harness.serviceWorker,
    storage: harness.storage,
    fetcher: harness.fetcher,
    digestSource: harness.digestSource,
    now: () => 456,
  };

  await checkForServiceWorkerRelease(options);
  harness.setSource('release-b');
  const result = await checkForServiceWorkerRelease(options);

  assert.equal(result.updated, true);
  assert.deepEqual(harness.registrations, [
    '/sw.js?release=hash-release-a',
    '/sw.js?release=hash-release-b',
  ]);
});

test('a page without a controlling worker repairs registration even when the hash is stored', async () => {
  const harness = createHarness();
  harness.storage.setItem('rosary-service-worker-release', 'hash-release-a');

  const result = await checkForServiceWorkerRelease({
    serviceWorker: harness.serviceWorker,
    storage: harness.storage,
    fetcher: harness.fetcher,
    digestSource: harness.digestSource,
    now: () => 789,
  });

  assert.equal(result.updated, true);
  assert.deepEqual(harness.registrations, ['/sw.js?release=hash-release-a']);
});
