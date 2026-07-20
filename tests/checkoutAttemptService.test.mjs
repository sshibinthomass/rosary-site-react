import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CHECKOUT_TRACKING_DEADLINE_MS,
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

test('customer diagnostics use only the Vercel API while Firestore client access remains admin-only', async () => {
  const source = await readFile(serviceUrl, 'utf8');

  assert.match(source, /createCheckoutAttemptTransport/);
  assert.match(source, /persistOperation/);
  assert.doesNotMatch(source, /\bsetDoc\b|\barrayUnion\b|\bTimestamp\b/);
  assert.match(source, /\bgetDocs\b/);
  assert.match(source, /\bupdateDoc\b/);
});

test('sends an exact minimal-PII create request with authorization kept out of the payload', async () => {
  const calls = [];
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
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
    /private@example|Rose Lane|682001|Ernakulam|Kerala|email|address|pincode|district|state|capabilityToken/i,
  );
  assert.equal(authorization.capabilityToken, '0a'.repeat(32));
  assert.equal('capabilityToken' in tracker, false);
});

test('includes userId only with a matching Firebase ID token and otherwise omits identity without blocking', async () => {
  for (const [label, getIdentity, expectedUserId] of [
    ['verified', async () => ({ userId: 'user-123', firebaseIdToken: 'firebase-id-token' }), 'user-123'],
    ['mismatch', async () => ({ userId: 'someone-else', firebaseIdToken: 'wrong-token' }), undefined],
    ['unavailable', async () => { throw new Error('auth unavailable'); }, undefined],
  ]) {
    const calls = [];
    await assert.doesNotReject(createCheckoutTrackerSession(checkoutInput({ userId: 'user-123' }), {
      getIdentity,
      persistOperation: async (operation, authorization) => calls.push({ operation, authorization }),
      generators: fixedGenerators(),
    }), label);

    assert.equal(calls[0].operation.payload.userId, expectedUserId, label);
    assert.equal(
      calls[0].authorization.firebaseIdToken,
      expectedUserId ? 'firebase-id-token' : undefined,
      label,
    );
  }
});

test('bounds retryable persistence and queues one whole group anchored by create without raw tokens', async () => {
  assert.ok(CHECKOUT_TRACKING_DEADLINE_MS <= 1_000);
  const groups = [];
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
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
  assert.doesNotMatch(JSON.stringify(groups), /capabilityToken|firebaseIdToken|private@example|Rose Lane/i);
});

test('records API-compatible forward events, linked order identifiers, failures, and completion', async () => {
  const operations = [];
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
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

test('keeps the same authorized session for truthful WhatsApp retry recovery', async () => {
  const calls = [];
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
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
  assert.equal(new Set(calls.map(({ authorization }) => authorization.capabilityToken)).size, 1);
});

test('records a failed WhatsApp retry on the same attempt without completing it', async () => {
  const calls = [];
  const tracker = await createCheckoutTrackerSession(checkoutInput(), {
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
  assert.equal(new Set(calls.map(({ authorization }) => authorization.capabilityToken)).size, 1);
});

test('strips capability hashes and sanitizes approved cart fields for admin reads', async () => {
  const attempts = await getAllCheckoutAttempts({
    fetchAll: async () => [{
      id: 'attempt-1',
      supportCode: 'CHK-7K2M9Q',
      capabilityTokenHash: 'not-for-the-page',
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

test('validates all admin statuses and preserves notes while setting or clearing resolvedAt', async () => {
  const writes = [];
  const persistence = { updateResolution: async (id, updates) => writes.push({ id, updates }) };

  for (const resolutionStatus of ['open', 'investigating', 'resolved']) {
    await updateCheckoutAttemptResolution('attempt-1', {
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
  const source = await readFile(serviceUrl, 'utf8');
  assert.match(source, /resolutionStatus\s*===\s*['"]resolved['"][\s\S]*serverTimestamp\(\)[\s\S]*deleteField\(\)/);
});
