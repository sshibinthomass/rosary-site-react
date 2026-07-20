import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CHECKOUT_TRACKING_DEADLINE_MS,
  buildCheckoutAttemptResolutionWrite,
  createCheckoutTrackerSession,
  getAllCheckoutAttempts,
  updateCheckoutAttemptResolution,
} from '../src/services/checkoutAttemptService.js';

const serviceUrl = new URL('../src/services/checkoutAttemptService.js', import.meta.url);

function fixedGenerators() {
  const alphabet = 'ABCDEFG7HJKLN2PRMST9UVQWXYZ34568';
  const supportBytes = Array.from('7K2M9Q', (character) => alphabet.indexOf(character));
  let sequence = 0;
  return {
    now: () => new Date('2026-07-20T10:00:00.000Z'),
    randomUUID: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    randomBytes: (length) => length === 6
      ? Uint8Array.from(supportBytes)
      : new Uint8Array(length).fill(10),
  };
}

function checkoutInput(overrides = {}) {
  return {
    customer: {
      name: 'Anu',
      phone: '+91 98765 43210',
      whatsapp: '+91 99887 76655',
      email: 'private@example.com',
      address: 'Rose Lane',
      pincode: '682001',
      district: 'Ernakulam',
      state: 'Kerala',
    },
    totalAmount: 750,
    items: [{ id: 42, name: 'Rosary plant', price: 375, quantity: 2 }],
    ...overrides,
  };
}

const getWriterIdToken = async () => 'writer-id-token';

test('customer diagnostics use only the Vercel API while Firestore client access remains admin-only', async () => {
  const source = await readFile(serviceUrl, 'utf8');

  assert.match(source, /createCheckoutAttemptTransport/);
  assert.match(source, /getCheckoutDiagnosticWriterIdToken/);
  assert.match(source, /persistOperation/);
  assert.doesNotMatch(source, /authorizationSessions/);
  assert.doesNotMatch(source, /\bsetDoc\b|\barrayUnion\b|\bTimestamp\b/);
  assert.match(source, /\bgetDocs\b/);
  assert.match(source, /\bupdateDoc\b/);
});

test('sends an exact minimal-PII create request with authorization kept out of the payload', async () => {
  const calls = [];
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
    getWriterIdToken,
    persistOperation: async (operation, authorization) => calls.push({ operation, authorization }),
    enqueueGroup: () => assert.fail('successful persistence must not enqueue'),
    generators: fixedGenerators(),
  });

  assert.equal(tracker.attemptId, '00000000-0000-4000-8000-000000000001');
  assert.equal(tracker.supportCode, 'CHK-7K2M9Q');
  assert.equal(calls.length, 1);
  const { operation, authorization } = calls[0];
  assert.equal(operation.type, 'create');
  assert.deepEqual(operation.payload.customer, {
    name: 'Anu', phone: '919876543210', whatsapp: '919988776655',
  });
  assert.deepEqual(operation.payload.items, [{
    productId: '42', name: 'Rosary plant', price: 375, quantity: 2,
  }]);
  assert.doesNotMatch(
    JSON.stringify(operation),
    /private@example|Rose Lane|682001|Ernakulam|Kerala|email|address|pincode|district|state|writerIdToken|primaryUserIdToken/i,
  );
  assert.equal(authorization.writerIdToken, 'writer-id-token');
  assert.equal(authorization.primaryUserIdToken, undefined);
  assert.doesNotMatch(JSON.stringify(operation), /writer-id-token/);
});

test('acquires a fresh writer ID token for create and every lifecycle update', async () => {
  const calls = [];
  let tokenSequence = 0;
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
    getWriterIdToken: async () => `writer-token-${++tokenSequence}`,
    persistOperation: async (operation, authorization) => calls.push({ operation, authorization }),
    generators: fixedGenerators(),
  });

  await tracker.stage('details_validated');
  await tracker.stage('order_saved', { order: { id: 'doc-1', orderId: 'RPH-1' } });

  assert.deepEqual(calls.map(({ authorization }) => authorization.writerIdToken), [
    'writer-token-1', 'writer-token-2', 'writer-token-3',
  ]);
  assert.ok(calls.every(({ operation }) => !JSON.stringify(operation).includes('writer-token-')));
});

test('includes userId only with a matching Firebase ID token and otherwise omits identity without blocking', async () => {
  for (const [label, getIdentity, expectedUserId] of [
    ['verified', async () => ({ userId: 'user-123', primaryUserIdToken: 'primary-id-token' }), 'user-123'],
    ['mismatch', async () => ({ userId: 'someone-else', primaryUserIdToken: 'wrong-token' }), undefined],
    ['unavailable', async () => { throw new Error('auth unavailable'); }, undefined],
  ]) {
    const calls = [];
    await assert.doesNotReject(createCheckoutTrackerSession(checkoutInput({ userId: 'user-123' }), {
      getIdentity,
      getWriterIdToken,
      persistOperation: async (operation, authorization) => calls.push({ operation, authorization }),
      generators: fixedGenerators(),
    }), label);

    assert.equal(calls[0].operation.payload.userId, expectedUserId, label);
    assert.equal(
      calls[0].authorization.primaryUserIdToken,
      expectedUserId ? 'primary-id-token' : undefined,
      label,
    );
  }
});

test('bounds retryable persistence and queues one whole group anchored by create without raw tokens', async () => {
  assert.ok(CHECKOUT_TRACKING_DEADLINE_MS <= 1_000);
  const groups = [];
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
    getWriterIdToken,
    persistOperation: () => new Promise(() => {}),
    enqueueGroup: (attemptGroup) => groups.push(structuredClone(attemptGroup)),
    generators: fixedGenerators(),
    persistenceDeadlineMs: 20,
  });
  await tracker.stage('details_validated');

  assert.equal(groups.length, 2);
  assert.deepEqual(groups.at(-1).operations.map(({ type }) => type), ['create', 'update']);
  assert.equal(groups.at(-1).attemptId, tracker.attemptId);
  assert.equal(typeof groups.at(-1).expiresAt, 'string');
  assert.doesNotMatch(JSON.stringify(groups), /writerIdToken|primaryUserIdToken|firebaseIdToken|private@example|Rose Lane/i);
});

test('records API-compatible forward events, linked order identifiers, failures, and completion', async () => {
  const operations = [];
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
    getWriterIdToken,
    persistOperation: async (operation) => operations.push(operation),
    generators: fixedGenerators(),
  });

  await tracker.stage('details_validated');
  await tracker.stage('order_saved', {
    order: { id: 'firestore-order-id', orderId: 'RPH-20260720-ABC123' },
  });
  await tracker.stage('order_verified');
  await tracker.stage('whatsapp_opened');
  await tracker.complete();

  const updates = operations.slice(1).map(({ payload }) => payload);
  assert.deepEqual(updates.map(({ currentStage }) => currentStage), [
    'details_validated', 'order_saved', 'order_verified', 'whatsapp_opened', 'completed',
  ]);
  assert.equal(updates[1].linkedOrderDocumentId, 'firestore-order-id');
  assert.equal(updates[1].linkedOrderId, 'RPH-20260720-ABC123');
  assert.ok(updates.every((payload) => payload.event.stage === payload.currentStage));
  assert.equal(updates.at(-1).result, 'successful');

  const failed = [];
  const failingTracker = await createCheckoutTrackerSession(checkoutInput(), {
    getWriterIdToken,
    persistOperation: async (operation) => failed.push(operation),
    generators: fixedGenerators(),
  });
  await failingTracker.fail(Object.assign(new Error('private raw message'), {
    code: 'firestore/permission-denied',
  }));
  assert.equal(failed.at(-1).payload.result, 'failed');
  assert.deepEqual(failed.at(-1).payload.event.error, failed.at(-1).payload.error);
  assert.doesNotMatch(JSON.stringify(failed.at(-1)), /private raw message/);
});

test('refreshes writer authorization during truthful WhatsApp retry recovery', async () => {
  const calls = [];
  let tokenSequence = 0;
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
    getWriterIdToken: async () => `writer-token-${++tokenSequence}`,
    persistOperation: async (operation, authorization) => calls.push({ operation, authorization }),
    generators: fixedGenerators(),
  });
  await tracker.stage('details_validated');
  await tracker.stage('order_saved', { order: { id: 'doc-1', orderId: 'RPH-1' } });
  await tracker.stage('order_verified');
  await tracker.fail(Object.assign(new Error('blocked'), { code: 'whatsapp-launch-failed' }));
  await tracker.recordWhatsAppRetry({ success: true });

  assert.deepEqual(calls.slice(-2).map(({ operation }) => operation.payload.currentStage), [
    'whatsapp_opened', 'completed',
  ]);
  assert.equal(calls.at(-2).operation.payload.result, 'in_progress');
  assert.equal(calls.at(-1).operation.payload.result, 'successful');
  assert.equal(new Set(calls.map(({ authorization }) => authorization.writerIdToken)).size, calls.length);
});

test('records a failed WhatsApp retry on the same attempt without completing it', async () => {
  const calls = [];
  let tokenSequence = 0;
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
    getWriterIdToken: async () => `writer-token-${++tokenSequence}`,
    persistOperation: async (operation, authorization) => calls.push({ operation, authorization }),
    generators: fixedGenerators(),
  });
  await tracker.stage('details_validated');
  await tracker.stage('order_saved', { order: { id: 'doc-1', orderId: 'RPH-1' } });
  await tracker.stage('order_verified');
  await tracker.fail(Object.assign(new Error('blocked'), { code: 'whatsapp-launch-failed' }));
  await tracker.recordWhatsAppRetry({ success: false, error: new Error('still blocked') });

  const retry = calls.at(-1);
  assert.equal(retry.operation.attemptId, tracker.attemptId);
  assert.equal(retry.operation.payload.currentStage, 'order_verified');
  assert.equal(retry.operation.payload.result, 'failed');
  assert.equal(retry.operation.payload.error.code, 'whatsapp-launch-failed');
  assert.equal(retry.operation.payload.event.error.code, 'whatsapp-launch-failed');
  assert.equal(calls.some(({ operation }) => operation.payload.currentStage === 'completed'), false);
  assert.equal(new Set(calls.map(({ authorization }) => authorization.writerIdToken)).size, calls.length);
});

test('strips writer ownership metadata and sanitizes approved cart fields for admin reads', async () => {
  const attempts = await getAllCheckoutAttempts({
    fetchAll: async () => [{
      id: 'attempt-1',
      supportCode: 'CHK-7K2M9Q',
      writerUid: 'not-for-the-page',
      customer: { name: 'Anu', phone: '111', whatsapp: '222', email: 'legacy@example.com' },
      delivery: { address: 'private street', pincode: '123456', whatsapp: '333' },
      email: 'legacy-top-level@example.com',
      address: 'private top-level street',
      error: { category: 'unknown', code: 'unknown', message: 'private street details' },
      events: [{
        eventId: 'event-1', stage: 'started', outcome: 'failed',
        occurredAt: '2026-07-20T10:00:00.000Z',
        error: { category: 'unknown', code: 'unknown', message: 'private event details' },
        address: 'private event address',
      }],
      items: [{ productId: '42', name: 'Plant', price: 25, quantity: 2, credentials: 'secret' }],
      createdAt: { toDate: () => new Date('2026-07-20T10:00:00.000Z') },
    }],
  });

  assert.deepEqual(attempts, [{
    id: 'attempt-1',
    supportCode: 'CHK-7K2M9Q',
    error: {
      category: 'unknown', code: 'unknown', message: 'Checkout could not be completed.',
    },
    customer: { name: 'Anu', phone: '111', whatsapp: '222' },
    items: [{ productId: '42', name: 'Plant', price: 25, quantity: 2 }],
    createdAt: '2026-07-20T10:00:00.000Z',
    events: [{
      eventId: 'event-1', stage: 'started', outcome: 'failed',
      occurredAt: '2026-07-20T10:00:00.000Z',
      error: {
        category: 'unknown', code: 'unknown', message: 'Checkout could not be completed.',
      },
    }],
  }]);
  assert.doesNotMatch(JSON.stringify(attempts), /private|example\.com|123456/);
});

test('validates all admin statuses and passes the current attempt into persistence', async () => {
  const writes = [];
  const persistence = {
    updateResolution: async (id, updates, attempt) => writes.push({ id, updates, attempt }),
  };

  for (const resolutionStatus of ['open', 'investigating', 'resolved']) {
    const attempt = { id: 'attempt-1', resolutionStatus: 'open' };
    await updateCheckoutAttemptResolution(attempt, {
      resolutionStatus,
      adminNotes: ' Keep this note. ',
    }, persistence);
  }
  await assert.rejects(
    updateCheckoutAttemptResolution('attempt-1', { resolutionStatus: 'closed' }, persistence),
    /resolution status/i,
  );

  assert.deepEqual(writes.map(({ updates }) => updates.resolutionStatus), [
    'open', 'investigating', 'resolved',
  ]);
  assert.ok(writes.every(({ updates }) => updates.adminNotes === 'Keep this note.'));
  assert.ok(writes.every(({ attempt }) => attempt.resolutionStatus === 'open'));
});

test('sets resolvedAt only on resolve transition, preserves it for notes, and clears it on reopen', () => {
  const timestamp = { type: 'server-timestamp' };
  const deleted = { type: 'delete-field' };
  const operations = {
    serverTimestamp: () => timestamp,
    deleteField: () => deleted,
  };

  const enterResolved = buildCheckoutAttemptResolutionWrite(
    { resolutionStatus: 'investigating' },
    { resolutionStatus: 'resolved', adminNotes: 'done' },
    operations,
  );
  const saveResolvedNotes = buildCheckoutAttemptResolutionWrite(
    { resolutionStatus: 'resolved', resolvedAt: '2026-07-20T10:00:00.000Z' },
    { resolutionStatus: 'resolved', adminNotes: 'more context' },
    operations,
  );
  const reopen = buildCheckoutAttemptResolutionWrite(
    { resolutionStatus: 'resolved', resolvedAt: '2026-07-20T10:00:00.000Z' },
    { resolutionStatus: 'open', adminNotes: 'follow up' },
    operations,
  );
  const stayOpen = buildCheckoutAttemptResolutionWrite(
    { resolutionStatus: 'open' },
    { resolutionStatus: 'open', adminNotes: 'still open' },
    operations,
  );

  assert.equal(enterResolved.resolvedAt, timestamp);
  assert.equal('resolvedAt' in saveResolvedNotes, false);
  assert.equal(reopen.resolvedAt, deleted);
  assert.equal('resolvedAt' in stayOpen, false);
  assert.equal(enterResolved.updatedAt, timestamp);
});
