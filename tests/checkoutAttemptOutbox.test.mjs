import assert from 'node:assert/strict';
import test from 'node:test';

import { flushCheckoutAttemptOutbox } from '../src/services/checkoutAttemptService.js';
import {
  CHECKOUT_OUTBOX_GROUP_LIMIT,
  CHECKOUT_OUTBOX_KEY,
  enqueueCheckoutAttemptGroup,
  pruneCheckoutOutbox,
  readCheckoutOutbox,
} from '../src/utils/checkoutAttemptOutbox.js';

const NOW = new Date('2026-07-20T10:00:00.000Z');
const EXPIRES = new Date('2027-01-16T10:00:00.000Z').toISOString();

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}

function operation(attemptId, type, index = 0) {
  return {
    operationId: `${attemptId}:${type}:${index}`,
    attemptId,
    type,
    payload: type === 'create'
      ? { attemptId, expiresAt: EXPIRES, customer: { name: `Customer ${attemptId}`, phone: '', whatsapp: '' } }
      : { attemptId, currentStage: `stage-${index}` },
  };
}

function group(attemptId, updateCount = 0) {
  return {
    attemptId,
    expiresAt: EXPIRES,
    operations: [
      operation(attemptId, 'create'),
      ...Array.from({ length: updateCount }, (_, index) => operation(attemptId, 'update', index + 1)),
    ],
  };
}

test('stores and evicts whole attempt groups without splitting operation order', () => {
  const storage = createStorage();
  for (let index = 0; index <= CHECKOUT_OUTBOX_GROUP_LIMIT; index += 1) {
    assert.equal(enqueueCheckoutAttemptGroup(storage, group(`attempt-${index}`, 2), { now: () => NOW }), true);
  }

  const groups = readCheckoutOutbox(storage);
  assert.equal(groups.length, CHECKOUT_OUTBOX_GROUP_LIMIT);
  assert.equal(groups[0].attemptId, 'attempt-1');
  assert.equal(groups.at(-1).attemptId, `attempt-${CHECKOUT_OUTBOX_GROUP_LIMIT}`);
  assert.deepEqual(groups[0].operations.map(({ type }) => type), ['create', 'update', 'update']);
});

test('deduplicates operation IDs while preserving FIFO within one attempt', () => {
  const storage = createStorage();
  const attemptGroup = group('attempt-a', 2);
  assert.equal(enqueueCheckoutAttemptGroup(storage, attemptGroup, { now: () => NOW }), true);
  assert.equal(enqueueCheckoutAttemptGroup(storage, {
    ...attemptGroup,
    operations: [attemptGroup.operations[1], operation('attempt-a', 'update', 3)],
  }, { now: () => NOW }), true);

  assert.deepEqual(
    readCheckoutOutbox(storage)[0].operations.map(({ operationId }) => operationId),
    ['attempt-a:create:0', 'attempt-a:update:1', 'attempt-a:update:2', 'attempt-a:update:3'],
  );
});

test('prunes missing-create orphans, malformed groups, and expired PII', () => {
  const storage = createStorage({
    [CHECKOUT_OUTBOX_KEY]: JSON.stringify([
      { attemptId: 'orphan', expiresAt: EXPIRES, operations: [operation('orphan', 'update', 1)] },
      { attemptId: 'malformed', expiresAt: EXPIRES, operations: [{ nope: true }] },
      {
        ...group('expired'),
        expiresAt: '2026-07-19T09:00:00.000Z',
        operations: [{
          ...operation('expired', 'create'),
          payload: {
            ...operation('expired', 'create').payload,
            expiresAt: '2026-07-19T09:00:00.000Z',
            customer: { name: 'Expired PII', phone: '919999999999', whatsapp: '' },
          },
        }],
      },
      group('valid'),
    ]),
  });

  const result = pruneCheckoutOutbox(storage, { now: () => NOW });

  assert.deepEqual(result.groups.map(({ attemptId }) => attemptId), ['valid']);
  assert.deepEqual(result.removed.sort(), ['expired', 'malformed', 'orphan']);
  assert.doesNotMatch(storage.getItem(CHECKOUT_OUTBOX_KEY), /Expired PII|919999999999/);
});

test('drops an expired group when the app returns after its retention deadline', async () => {
  const storage = createStorage({
    [CHECKOUT_OUTBOX_KEY]: JSON.stringify([{
      ...group('expired-return'),
      expiresAt: '2026-07-20T09:59:59.999Z',
      operations: [{
        ...operation('expired-return', 'create'),
        payload: { ...operation('expired-return', 'create').payload, expiresAt: '2026-07-20T09:59:59.999Z' },
      }],
    }]),
  });
  const calls = [];

  const result = await flushCheckoutAttemptOutbox(storage, {
    now: () => NOW,
    getWriterIdToken: async () => 'writer-token',
    persistOperation: async (queuedOperation) => calls.push(queuedOperation.operationId),
  });

  assert.deepEqual(calls, []);
  assert.equal(result.remainingGroups, 0);
  assert.equal(storage.getItem(CHECKOUT_OUTBOX_KEY), null);
});

test('a permanent writer mismatch drops only that group and flushes a newer group', async () => {
  const storage = createStorage();
  enqueueCheckoutAttemptGroup(storage, group('bad'), { now: () => NOW });
  enqueueCheckoutAttemptGroup(storage, group('good'), { now: () => NOW });
  const calls = [];

  const result = await flushCheckoutAttemptOutbox(storage, {
    now: () => NOW,
    getWriterIdToken: async () => 'writer-token',
    persistOperation: async (queuedOperation) => {
      calls.push(queuedOperation.operationId);
      if (queuedOperation.attemptId === 'bad') {
        throw Object.assign(new Error('writer mismatch'), {
          classification: 'permanent', status: 403, code: 'writer-mismatch',
        });
      }
    },
  });

  assert.deepEqual(calls, ['bad:create:0', 'good:create:0']);
  assert.deepEqual(result, {
    flushedGroups: 1,
    droppedGroups: 1,
    retainedGroups: 0,
    remainingGroups: 0,
  });
});

test('a retryable group remains without blocking later groups', async () => {
  const storage = createStorage();
  enqueueCheckoutAttemptGroup(storage, group('offline', 1), { now: () => NOW });
  enqueueCheckoutAttemptGroup(storage, group('later'), { now: () => NOW });
  const calls = [];

  const result = await flushCheckoutAttemptOutbox(storage, {
    now: () => NOW,
    getWriterIdToken: async () => 'writer-token',
    persistOperation: async (queuedOperation) => {
      calls.push(queuedOperation.operationId);
      if (queuedOperation.attemptId === 'offline') {
        throw Object.assign(new Error('offline'), { classification: 'retryable', status: 503 });
      }
    },
  });

  assert.deepEqual(calls, ['offline:create:0', 'later:create:0']);
  assert.deepEqual(readCheckoutOutbox(storage).map(({ attemptId }) => attemptId), ['offline']);
  assert.deepEqual(result, {
    flushedGroups: 1,
    droppedGroups: 0,
    retainedGroups: 1,
    remainingGroups: 1,
  });
});

test('flushes operations FIFO and removes a group only after every operation succeeds', async () => {
  const storage = createStorage();
  enqueueCheckoutAttemptGroup(storage, group('ordered', 2), { now: () => NOW });
  const calls = [];

  await flushCheckoutAttemptOutbox(storage, {
    now: () => NOW,
    getWriterIdToken: async () => 'refreshed-writer-token',
    persistOperation: async (queuedOperation, authorization) => {
      assert.equal(authorization.writerIdToken, 'refreshed-writer-token');
      calls.push(queuedOperation.operationId);
    },
  });

  assert.deepEqual(calls, ['ordered:create:0', 'ordered:update:1', 'ordered:update:2']);
  assert.deepEqual(readCheckoutOutbox(storage), []);
});

test('a cold reload flush signs in or refreshes the writer for every queued operation', async () => {
  const storage = createStorage();
  enqueueCheckoutAttemptGroup(storage, group('cold-reload', 1), { now: () => NOW });
  const authorizations = [];
  let tokenSequence = 0;

  const result = await flushCheckoutAttemptOutbox(storage, {
    now: () => NOW,
    getWriterIdToken: async () => `restored-writer-token-${++tokenSequence}`,
    persistOperation: async (queuedOperation, authorization) => {
      authorizations.push({ queuedOperation, authorization });
    },
  });

  assert.deepEqual(authorizations.map(({ authorization }) => authorization.writerIdToken), [
    'restored-writer-token-1', 'restored-writer-token-2',
  ]);
  assert.ok(authorizations.every(({ authorization }) => !authorization.primaryUserIdToken));
  assert.equal(result.flushedGroups, 1);
  assert.deepEqual(readCheckoutOutbox(storage), []);
});

test('a cold create flush reacquires matching primary identity and omits it when refresh expires', async () => {
  const matchingStorage = createStorage();
  const matchingGroup = group('matching-primary');
  matchingGroup.operations[0].payload.userId = 'user-123';
  enqueueCheckoutAttemptGroup(matchingStorage, matchingGroup, { now: () => NOW });
  const matchingCalls = [];

  await flushCheckoutAttemptOutbox(matchingStorage, {
    now: () => NOW,
    getWriterIdToken: async () => 'writer-token',
    getIdentity: async () => ({ userId: 'user-123', primaryUserIdToken: 'fresh-primary-token' }),
    persistOperation: async (queuedOperation, authorization) => {
      matchingCalls.push({ queuedOperation, authorization });
    },
  });

  assert.equal(matchingCalls[0].queuedOperation.payload.userId, 'user-123');
  assert.equal(matchingCalls[0].authorization.primaryUserIdToken, 'fresh-primary-token');

  const expiredStorage = createStorage();
  const expiredGroup = group('expired-primary');
  expiredGroup.operations[0].payload.userId = 'user-123';
  enqueueCheckoutAttemptGroup(expiredStorage, expiredGroup, { now: () => NOW });
  const expiredCalls = [];

  await flushCheckoutAttemptOutbox(expiredStorage, {
    now: () => NOW,
    getWriterIdToken: async () => 'writer-token',
    getIdentity: async () => { throw Object.assign(new Error('expired'), { code: 'auth/user-token-expired' }); },
    persistOperation: async (queuedOperation, authorization) => {
      expiredCalls.push({ queuedOperation, authorization });
    },
  });

  assert.equal('userId' in expiredCalls[0].queuedOperation.payload, false);
  assert.equal(expiredCalls[0].authorization.primaryUserIdToken, undefined);
  assert.equal(expiredGroup.operations[0].payload.userId, 'user-123');
});

test('never stores ID tokens or authorization objects in an attempt group', () => {
  const storage = createStorage();
  const unsafe = group('unsafe-token');
  unsafe.operations[0].payload.writerIdToken = 'must-not-persist';
  unsafe.operations[0].payload.primaryUserIdToken = 'must-not-persist';

  assert.equal(enqueueCheckoutAttemptGroup(storage, unsafe, { now: () => NOW }), false);
  assert.equal(storage.getItem(CHECKOUT_OUTBOX_KEY), null);
});

test('concurrent enqueue during flush retains the new operation with its create anchor', async () => {
  const storage = createStorage();
  const initialGroup = group('concurrent');
  enqueueCheckoutAttemptGroup(storage, initialGroup, { now: () => NOW });
  let releasePersist;
  let markStarted;
  const persistStarted = new Promise((resolve) => { markStarted = resolve; });
  const persistGate = new Promise((resolve) => { releasePersist = resolve; });

  const firstFlush = flushCheckoutAttemptOutbox(storage, {
    now: () => NOW,
    getWriterIdToken: async () => 'writer-token',
    persistOperation: async () => {
      markStarted();
      await persistGate;
    },
  });
  await persistStarted;
  assert.equal(enqueueCheckoutAttemptGroup(storage, {
    ...initialGroup,
    operations: [initialGroup.operations[0], operation('concurrent', 'update', 1)],
  }, { now: () => NOW }), true);
  releasePersist();
  const firstResult = await firstFlush;

  assert.deepEqual(
    readCheckoutOutbox(storage)[0].operations.map(({ operationId }) => operationId),
    ['concurrent:create:0', 'concurrent:update:1'],
  );
  assert.equal(firstResult.remainingGroups, 1);

  const replayed = [];
  await flushCheckoutAttemptOutbox(storage, {
    now: () => NOW,
    getWriterIdToken: async () => 'writer-token',
    persistOperation: async (queuedOperation) => replayed.push(queuedOperation.operationId),
  });
  assert.deepEqual(replayed, ['concurrent:create:0', 'concurrent:update:1']);
  assert.deepEqual(readCheckoutOutbox(storage), []);
});

test('a permanent response cannot delete an operation enqueued while its request was awaiting', async () => {
  const storage = createStorage();
  const initialGroup = group('concurrent-permanent');
  enqueueCheckoutAttemptGroup(storage, initialGroup, { now: () => NOW });
  let rejectPersist;
  let markStarted;
  const persistStarted = new Promise((resolve) => { markStarted = resolve; });
  const persistGate = new Promise((_, reject) => { rejectPersist = reject; });

  const flush = flushCheckoutAttemptOutbox(storage, {
    now: () => NOW,
    getWriterIdToken: async () => 'different-writer-token',
    persistOperation: async () => {
      markStarted();
      await persistGate;
    },
  });
  await persistStarted;
  enqueueCheckoutAttemptGroup(storage, {
    ...initialGroup,
    operations: [initialGroup.operations[0], operation('concurrent-permanent', 'update', 1)],
  }, { now: () => NOW });
  rejectPersist(Object.assign(new Error('writer mismatch'), {
    classification: 'permanent', status: 403, code: 'writer-mismatch',
  }));
  const result = await flush;

  assert.deepEqual(
    readCheckoutOutbox(storage)[0].operations.map(({ operationId }) => operationId),
    ['concurrent-permanent:create:0', 'concurrent-permanent:update:1'],
  );
  assert.equal(result.droppedGroups, 0);
  assert.equal(result.retainedGroups, 1);
});
