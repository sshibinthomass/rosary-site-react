import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('wires a version-controlled Firestore indexes definition', async () => {
  const firebaseConfig = JSON.parse(await readFile(new URL('firebase.json', root), 'utf8'));

  assert.equal(firebaseConfig.firestore.rules, 'firestore.rules');
  assert.equal(firebaseConfig.firestore.indexes, 'firestore.indexes.json');
});

test('enables TTL for checkout attempt expiry without adding composite indexes', async () => {
  const indexes = JSON.parse(await readFile(new URL('firestore.indexes.json', root), 'utf8'));

  assert.deepEqual(indexes.indexes, []);
  assert.deepEqual(indexes.fieldOverrides, [{
    collectionGroup: 'checkoutAttempts',
    fieldPath: 'expiresAt',
    ttl: true,
    indexes: [],
  }]);
});
