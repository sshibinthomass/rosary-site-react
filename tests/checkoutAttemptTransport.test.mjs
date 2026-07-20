import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CheckoutAttemptTransportError,
  classifyCheckoutAttemptFailure,
  createCheckoutAttemptTransport,
} from '../src/utils/checkoutAttemptTransport.js';

const createOperation = {
  type: 'create',
  payload: {
    attemptId: '00000000-0000-4000-8000-000000000001',
    operationId: '00000000-0000-4000-8000-000000000001:create',
    supportCode: 'CHK-7K2M9Q',
    customer: { name: 'Anu', phone: '919876543210', whatsapp: '919988776655' },
    items: [{ productId: 'plant-49', name: 'Hydrangea', price: 39, quantity: 2 }],
    totalAmount: 78,
    currentStage: 'started',
    result: 'in_progress',
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
    expiresAt: '2027-01-16T10:00:00.000Z',
    event: {
      eventId: 'event-1', stage: 'started', outcome: 'success',
      occurredAt: '2026-07-20T10:00:00.000Z',
    },
    userId: 'user-123',
  },
};

test('sends writer and optional primary identity tokens only in separate API headers', async () => {
  const calls = [];
  const transport = createCheckoutAttemptTransport(async (...args) => {
    calls.push(args);
    return {
      ok: true,
      status: 201,
      json: async () => ({ attemptId: createOperation.payload.attemptId }),
    };
  });

  await transport.persist(createOperation, {
    writerIdToken: 'writer-id-token',
    primaryUserIdToken: 'primary-id-token',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/api/checkout-attempts');
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(calls[0][1].headers['Content-Type'], 'application/json');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer writer-id-token');
  assert.equal(calls[0][1].headers['X-Checkout-User-Token'], 'primary-id-token');
  assert.deepEqual(JSON.parse(calls[0][1].body), createOperation.payload);
  assert.doesNotMatch(calls[0][1].body, /writer-id-token|primary-id-token/);
});

test('classifies permanent HTTP failures separately from network, 429, and server failures', async () => {
  for (const [status, classification] of [[400, 'permanent'], [403, 'permanent'], [429, 'retryable'], [503, 'retryable']]) {
    const transport = createCheckoutAttemptTransport(async () => ({
      ok: false,
      status,
      json: async () => ({ error: { code: `http-${status}`, message: 'safe message' } }),
    }));
    await assert.rejects(
      transport.persist(createOperation, { writerIdToken: 'writer-id-token' }),
      (error) => {
        assert.ok(error instanceof CheckoutAttemptTransportError);
        assert.equal(error.classification, classification);
        assert.equal(error.status, status);
        return true;
      },
    );
  }

  const offline = createCheckoutAttemptTransport(async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(
    offline.persist(createOperation, { writerIdToken: 'writer-id-token' }),
    (error) => error instanceof CheckoutAttemptTransportError
      && error.classification === 'retryable'
      && error.status === 0,
  );
  assert.equal(classifyCheckoutAttemptFailure({ status: 422 }), 'permanent');
  assert.equal(classifyCheckoutAttemptFailure({ status: 429 }), 'retryable');
  assert.equal(classifyCheckoutAttemptFailure(new TypeError('network')), 'retryable');
});

test('uses PATCH for lifecycle operations and rejects a missing writer ID token', async () => {
  const calls = [];
  const transport = createCheckoutAttemptTransport(async (...args) => {
    calls.push(args);
    return { ok: true, status: 200, json: async () => ({}) };
  });
  const update = {
    type: 'update',
    payload: {
      attemptId: createOperation.payload.attemptId,
      operationId: 'event-2',
      currentStage: 'details_validated',
      result: 'in_progress',
      updatedAt: '2026-07-20T10:01:00.000Z',
      event: {
        eventId: 'event-2', stage: 'details_validated', outcome: 'success',
        occurredAt: '2026-07-20T10:01:00.000Z',
      },
    },
  };

  await assert.rejects(
    transport.persist(update, {}),
    (error) => error.classification === 'permanent' && error.code === 'missing-writer-id-token',
  );
  await transport.persist(update, { writerIdToken: 'writer-id-token' });
  assert.equal(calls[0][1].method, 'PATCH');
});
