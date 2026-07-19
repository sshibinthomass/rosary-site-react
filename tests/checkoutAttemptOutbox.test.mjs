import assert from 'node:assert/strict';
import test from 'node:test';

import {
  enqueueCheckoutOperation,
  readCheckoutOutbox,
  removeCheckoutOperation,
} from '../src/utils/checkoutAttemptOutbox.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}

test('deduplicates operations by operation ID and removes only the flushed operation', () => {
  const storage = createStorage();
  enqueueCheckoutOperation(storage, { operationId: 'op-1', type: 'create', payload: {} });
  enqueueCheckoutOperation(storage, { operationId: 'op-2', type: 'update', payload: {} });
  enqueueCheckoutOperation(storage, { operationId: 'op-1', type: 'create', payload: {} });

  assert.deepEqual(readCheckoutOutbox(storage).map(({ operationId }) => operationId), ['op-1', 'op-2']);
  assert.equal(removeCheckoutOperation(storage, 'op-1'), true);
  assert.deepEqual(readCheckoutOutbox(storage).map(({ operationId }) => operationId), ['op-2']);
  assert.equal(removeCheckoutOperation(storage, 'missing'), false);
});

test('preserves FIFO order and drops the oldest operation after 100 entries', () => {
  const storage = createStorage();
  for (let index = 0; index < 101; index += 1) {
    assert.equal(enqueueCheckoutOperation(storage, { operationId: `op-${index}`, type: 'create', payload: { index } }), true);
  }

  const outbox = readCheckoutOutbox(storage);
  assert.equal(outbox.length, 100);
  assert.equal(outbox[0].operationId, 'op-1');
  assert.equal(outbox.at(-1).operationId, 'op-100');
});

test('returns an empty outbox for invalid stored JSON and storage failures', () => {
  const invalidStorage = createStorage({ 'rosary.checkoutAttemptOutbox.v1': '{not json' });
  assert.deepEqual(readCheckoutOutbox(invalidStorage), []);

  const brokenStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.deepEqual(readCheckoutOutbox(brokenStorage), []);
  assert.equal(enqueueCheckoutOperation(brokenStorage, { operationId: 'op-1' }), false);
  assert.equal(removeCheckoutOperation(brokenStorage, 'op-1'), false);
});
