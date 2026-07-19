import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createCheckoutTrackerSession,
  flushCheckoutAttemptOutbox,
  getAllCheckoutAttempts,
  updateCheckoutAttemptResolution,
} from '../src/services/checkoutAttemptService.js';
import {
  enqueueCheckoutOperation,
  readCheckoutOutbox,
} from '../src/utils/checkoutAttemptOutbox.js';

const serviceUrl = new URL('../src/services/checkoutAttemptService.js', import.meta.url);

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
  };
}

function fixedGenerators() {
  const alphabet = 'ABCDEFG7HJKLN2PRMST9UVQWXYZ34568';
  const supportBytes = Array.from('7K2M9Q', (character) => alphabet.indexOf(character));
  let sequence = 0;

  return {
    now: () => new Date('2026-07-19T10:00:00.000Z'),
    randomUUID: () => `uuid-${sequence += 1}`,
    randomBytes: (length) => length === 6 ? Uint8Array.from(supportBytes) : new Uint8Array(length).fill(10),
  };
}

function checkoutInput() {
  return {
    orderId: 'RPH-PENDING',
    customer: { name: 'Anu', email: 'anu@example.com', phone: '+91 98765 43210' },
    delivery: { address: 'Rose Lane', phone: '+91 99887 76655', ignored: undefined },
    totalAmount: 750,
    items: [{ id: 42, name: 'Rosary plant', price: 375, quantity: 2 }],
  };
}

test('uses the checkoutAttempts collection and Firestore atomic/timestamp primitives', async () => {
  const source = await readFile(serviceUrl, 'utf8');

  assert.match(source, /const COLLECTION_NAME = ['"]checkoutAttempts['"]/);
  for (const api of ['setDoc', 'updateDoc', 'getDocs', 'query', 'orderBy', 'arrayUnion', 'serverTimestamp', 'Timestamp']) {
    assert.match(source, new RegExp(`\\b${api}\\b`));
  }
  assert.match(source, /arrayUnion\s*\(/);
  for (const field of ['createdAt', 'updatedAt', 'expiresAt']) {
    assert.match(source, new RegExp(`${field}:\\s*toTimestamp\\(`));
  }
});

test('isolates create and stage persistence failures in ordered JSON outbox operations', async () => {
  const queued = [];
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
    persistCreate: async () => { throw new Error('offline'); },
    persistUpdate: async () => { throw new Error('offline'); },
    enqueue: (operation) => queued.push(operation),
    generators: fixedGenerators(),
  });

  await assert.doesNotReject(tracker.stage('details_validated'));
  assert.equal(tracker.attemptId, 'uuid-1');
  assert.equal(tracker.supportCode, 'CHK-7K2M9Q');
  assert.deepEqual(queued.map(({ type }) => type), ['create', 'update']);
  assert.equal(new Set(queued.map(({ operationId }) => operationId)).size, 2);
  assert.ok(queued.every(({ attemptId, operationId }) =>
    attemptId === tracker.attemptId
    && typeof operationId === 'string'
    && operationId.length > 0));
  for (const { payload } of queued) {
    assert.deepEqual(payload, JSON.parse(JSON.stringify(payload)));
  }
  assert.equal(queued[0].payload.clientWriteToken.length, 64);
  assert.equal(queued[1].payload.currentStage, 'details_validated');
});

test('records exact order, failure, and completion state transitions without rejecting', async () => {
  const updates = [];
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
    persistCreate: async () => {},
    persistUpdate: async (operation) => updates.push(operation),
    enqueue: () => assert.fail('successful persistence must not enqueue'),
    generators: fixedGenerators(),
  });

  await tracker.stage('order_saved', { order: { id: 'firestore-order-id', orderId: 'RPH-20260719-ABC123' } });
  assert.deepEqual(updates.at(-1).payload, {
    currentStage: 'order_saved',
    updatedAt: '2026-07-19T10:00:00.000Z',
    linkedOrderDocumentId: 'firestore-order-id',
    linkedOrderId: 'RPH-20260719-ABC123',
    events: [updates.at(-1).payload.events[0]],
  });

  await assert.doesNotReject(tracker.fail(Object.assign(new Error('raw private failure'), { code: 'firestore/permission-denied' })));
  const failed = updates.at(-1).payload;
  assert.equal(failed.result, 'failed');
  assert.equal(failed.currentStage, 'order_saved');
  assert.equal(failed.error.code, 'permission-denied');
  assert.deepEqual(failed.events[0].error, failed.error);
  assert.doesNotMatch(JSON.stringify(failed), /raw private failure/);

  await assert.doesNotReject(tracker.complete());
  assert.equal(updates.at(-1).payload.currentStage, 'completed');
  assert.equal(updates.at(-1).payload.result, 'successful');
  assert.equal(updates.at(-1).payload.events[0].stage, 'completed');
});

test('queues later tracker updates after a transient failure to preserve event order', async () => {
  const attempted = [];
  const queued = [];
  let firstUpdate = true;
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
    persistCreate: async () => {},
    persistUpdate: async (operation) => {
      attempted.push(operation.payload.currentStage);
      if (firstUpdate) {
        firstUpdate = false;
        throw new Error('brief outage');
      }
    },
    enqueue: (operation) => queued.push(operation),
    generators: fixedGenerators(),
  });

  await tracker.stage('details_validated');
  await tracker.stage('order_saved', { order: { id: 'doc-1', orderId: 'RPH-1' } });

  assert.deepEqual(attempted, ['details_validated']);
  assert.deepEqual(queued.map(({ payload }) => payload.currentStage), ['details_validated', 'order_saved']);
});

test('links an order without changing the lifecycle stage', async () => {
  const updates = [];
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
    persistCreate: async () => {},
    persistUpdate: async (operation) => updates.push(operation),
    enqueue: () => {},
    generators: fixedGenerators(),
  });

  await assert.doesNotReject(tracker.linkOrder({ id: 'doc-9', orderId: 'RPH-9' }));
  assert.deepEqual(updates[0].payload, {
    linkedOrderDocumentId: 'doc-9',
    linkedOrderId: 'RPH-9',
    updatedAt: '2026-07-19T10:00:00.000Z',
  });
});

test('flushes queued operations sequentially and stops without removing the first failure', async () => {
  const storage = createStorage();
  const operations = [
    { operationId: 'op-1', attemptId: 'a-1', type: 'create', payload: { createdAt: '2026-07-19T10:00:00.000Z' } },
    { operationId: 'op-2', attemptId: 'a-1', type: 'update', payload: { currentStage: 'details_validated' } },
    { operationId: 'op-3', attemptId: 'a-1', type: 'update', payload: { currentStage: 'completed' } },
  ];
  operations.forEach((operation) => enqueueCheckoutOperation(storage, operation));
  const calls = [];

  const result = await flushCheckoutAttemptOutbox(storage, {
    persistCreate: async (operation) => calls.push(operation.operationId),
    persistUpdate: async (operation) => {
      calls.push(operation.operationId);
      if (operation.operationId === 'op-2') throw new Error('still offline');
    },
  });

  assert.deepEqual(calls, ['op-1', 'op-2']);
  assert.deepEqual(result, { flushed: 1, remaining: 2 });
  assert.deepEqual(readCheckoutOutbox(storage).map(({ operationId }) => operationId), ['op-2', 'op-3']);
});

test('does not count or advance past a persisted operation that storage cannot remove', async () => {
  const values = new Map();
  let rejectWrites = false;
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      if (rejectWrites) throw new Error('storage blocked');
      values.set(key, value);
    },
  };
  enqueueCheckoutOperation(storage, {
    operationId: 'op-1', attemptId: 'a-1', type: 'update', payload: { currentStage: 'completed' },
  });
  rejectWrites = true;
  const persisted = [];

  const result = await flushCheckoutAttemptOutbox(storage, {
    persistCreate: async () => {},
    persistUpdate: async (operation) => persisted.push(operation.operationId),
  });

  assert.deepEqual(persisted, ['op-1']);
  assert.deepEqual(result, { flushed: 0, remaining: 1 });
});

test('strips the client write token from admin reads', async () => {
  const attempts = await getAllCheckoutAttempts({
    fetchAll: async () => [{
      id: 'attempt-1',
      supportCode: 'CHK-7K2M9Q',
      clientWriteToken: 'not-for-the-page',
      createdAt: { toDate: () => new Date('2026-07-19T10:00:00.000Z') },
    }],
  });

  assert.deepEqual(attempts, [{
    id: 'attempt-1',
    supportCode: 'CHK-7K2M9Q',
    createdAt: '2026-07-19T10:00:00.000Z',
  }]);
});

test('validates admin resolution status, trims notes, and timestamps only resolved attempts', async () => {
  const writes = [];
  const persistence = { updateResolution: async (id, updates) => writes.push({ id, updates }) };

  await assert.rejects(
    updateCheckoutAttemptResolution('attempt-1', { resolutionStatus: 'closed', adminNotes: '' }, persistence),
    /resolution status/i,
  );
  await updateCheckoutAttemptResolution('attempt-1', {
    resolutionStatus: 'investigating',
    adminNotes: `  ${'a'.repeat(2_100)}  `,
  }, persistence);
  await updateCheckoutAttemptResolution('attempt-1', {
    resolutionStatus: 'resolved',
    adminNotes: ' Fixed after contacting the customer. ',
  }, persistence);

  assert.equal(writes[0].updates.adminNotes.length, 2_000);
  assert.equal('resolvedAt' in writes[0].updates, false);
  assert.equal(writes[1].updates.adminNotes, 'Fixed after contacting the customer.');
  assert.equal(writes[1].updates.setResolvedAt, true);
});
