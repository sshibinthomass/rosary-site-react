import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHECKOUT_PRIMARY_USER_TOKEN_HEADER,
  CHECKOUT_RETENTION_MS,
  classifyCheckoutAttemptResponse,
  createCheckoutAttemptsHandler,
} from '../api/checkout-attempts-core.js';

const NOW = new Date('2026-07-20T10:00:00.000Z');
const ATTEMPT_ID = '00000000-0000-4000-8000-000000000001';
const WRITER_TOKEN = 'writer-token';
const OTHER_WRITER_TOKEN = 'other-writer-token';
const PRIMARY_TOKEN = 'primary-user-token';

function createMemoryRepository(initial = {}) {
  const documents = new Map(Object.entries(structuredClone(initial)));
  const writes = [];
  return {
    documents,
    writes,
    async transact(attemptId, mutate) {
      const current = documents.has(attemptId)
        ? structuredClone(documents.get(attemptId))
        : null;
      const decision = await mutate(current);
      if (decision.document) {
        documents.set(attemptId, structuredClone(decision.document));
        writes.push({ attemptId, document: structuredClone(decision.document) });
      }
      return decision.response;
    },
  };
}

function event(stage, overrides = {}) {
  const { suffix = '1', ...fields } = overrides;
  return {
    eventId: `event-${stage}-${suffix}`,
    stage,
    outcome: 'success',
    occurredAt: NOW.toISOString(),
    ...fields,
  };
}

function createBody(overrides = {}) {
  const createdAt = NOW.toISOString();
  return {
    attemptId: ATTEMPT_ID,
    operationId: `${ATTEMPT_ID}:create`,
    supportCode: 'CHK-7K2M9Q',
    customer: { name: 'Anu', phone: '919876543210', whatsapp: '919988776655' },
    items: [{ productId: 'plant-49', name: 'Hydrangea', price: 39, quantity: 2 }],
    totalAmount: 78,
    currentStage: 'started',
    result: 'in_progress',
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date(NOW.getTime() + CHECKOUT_RETENTION_MS).toISOString(),
    event: event('started'),
    ...overrides,
  };
}

function patchBody(stage, overrides = {}) {
  const { suffix = '2', ...fields } = overrides;
  const updateEvent = event(stage, { suffix });
  return {
    attemptId: ATTEMPT_ID,
    operationId: `${ATTEMPT_ID}:event:${updateEvent.eventId}`,
    currentStage: stage,
    result: stage === 'completed' ? 'successful' : 'in_progress',
    updatedAt: NOW.toISOString(),
    event: updateEvent,
    ...fields,
  };
}

async function verifyTestIdToken(token) {
  if (token === WRITER_TOKEN) {
    return { uid: 'writer-1', firebase: { sign_in_provider: 'anonymous' } };
  }
  if (token === OTHER_WRITER_TOKEN) {
    return { uid: 'writer-2', firebase: { sign_in_provider: 'anonymous' } };
  }
  if (token === PRIMARY_TOKEN) {
    return { uid: 'user-123', firebase: { sign_in_provider: 'google.com' } };
  }
  if (token === 'wrong-primary-token') {
    return { uid: 'someone-else', firebase: { sign_in_provider: 'google.com' } };
  }
  if (token === 'non-anonymous-writer-token') {
    return { uid: 'signed-in-user', firebase: { sign_in_provider: 'google.com' } };
  }
  throw new Error('invalid token');
}

function createHandler(repository, overrides = {}) {
  return createCheckoutAttemptsHandler({
    repository,
    now: () => NOW,
    verifyIdToken: verifyTestIdToken,
    ...overrides,
  });
}

async function request(handler, method, body, options = {}) {
  return handler({
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${WRITER_TOKEN}`,
      ...(options.headers || {}),
    },
    body,
  });
}

test('requires a verified anonymous writer token and stores only its immutable UID', async () => {
  const repository = createMemoryRepository();
  const handler = createHandler(repository);

  const missing = await handler({
    method: 'POST', headers: { 'content-type': 'application/json' }, body: createBody(),
  });
  const invalid = await request(handler, 'POST', createBody(), {
    headers: { authorization: 'Bearer invalid-token' },
  });
  const nonAnonymous = await request(handler, 'POST', createBody(), {
    headers: { authorization: 'Bearer non-anonymous-writer-token' },
  });
  const created = await request(handler, 'POST', createBody());
  const stored = repository.documents.get(ATTEMPT_ID);

  assert.equal(missing.status, 401);
  assert.equal(missing.body.error.code, 'writer-token-required');
  assert.equal(invalid.status, 401);
  assert.equal(invalid.body.error.code, 'invalid-writer-token');
  assert.equal(nonAnonymous.status, 403);
  assert.equal(nonAnonymous.body.error.code, 'anonymous-writer-required');
  assert.equal(created.status, 201);
  assert.equal(stored.writerUid, 'writer-1');
  assert.doesNotMatch(JSON.stringify(stored), /writer-token|primary-user-token/);
  assert.doesNotMatch(JSON.stringify(created), /writer-1|writer-token/);
});

test('POST is idempotent only for the same writer and never overwrites an advanced record', async () => {
  const repository = createMemoryRepository();
  const handler = createHandler(repository);

  assert.equal((await request(handler, 'POST', createBody())).status, 201);
  const advanced = {
    ...repository.documents.get(ATTEMPT_ID),
    currentStage: 'order_verified',
    result: 'failed',
  };
  repository.documents.set(ATTEMPT_ID, advanced);

  const replay = await request(handler, 'POST', createBody());
  const conflict = await request(handler, 'POST', createBody(), {
    headers: { authorization: `Bearer ${OTHER_WRITER_TOKEN}` },
  });

  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotent, true);
  assert.deepEqual(repository.documents.get(ATTEMPT_ID), advanced);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, 'attempt-conflict');
});

test('PATCH rejects a different writer, backward stages, and updates without a matching event', async () => {
  const repository = createMemoryRepository();
  const handler = createHandler(repository);
  await request(handler, 'POST', createBody());
  await request(handler, 'PATCH', patchBody('details_validated'));

  const wrongWriter = await request(handler, 'PATCH', patchBody('order_saved', {
    linkedOrderDocumentId: 'firestore-order-id',
    linkedOrderId: 'RPH-20260720-ABC123',
  }), { headers: { authorization: `Bearer ${OTHER_WRITER_TOKEN}` } });
  const backward = await request(handler, 'PATCH', patchBody('started', { suffix: 'backward' }));
  const mismatchedEvent = await request(handler, 'PATCH', {
    ...patchBody('order_saved', {
      linkedOrderDocumentId: 'firestore-order-id',
      linkedOrderId: 'RPH-20260720-ABC123',
    }),
    event: event('details_validated', { suffix: 'mismatch' }),
  });

  assert.equal(wrongWriter.status, 403);
  assert.equal(wrongWriter.body.error.code, 'writer-mismatch');
  assert.equal(backward.status, 409);
  assert.equal(backward.body.error.code, 'invalid-lifecycle-transition');
  assert.equal(mismatchedEvent.status, 400);
  assert.equal(mismatchedEvent.body.error.code, 'event-mismatch');
});

test('PATCH permits ordered transitions, appends one event, and replays event IDs idempotently', async () => {
  const repository = createMemoryRepository();
  const handler = createHandler(repository);
  await request(handler, 'POST', createBody());
  await request(handler, 'PATCH', patchBody('details_validated'));
  const orderSaved = patchBody('order_saved', {
    suffix: 'saved',
    linkedOrderDocumentId: 'firestore-order-id',
    linkedOrderId: 'RPH-20260720-ABC123',
  });

  const updated = await request(handler, 'PATCH', orderSaved);
  const replay = await request(handler, 'PATCH', orderSaved);
  const stored = repository.documents.get(ATTEMPT_ID);

  assert.equal(updated.status, 200);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotent, true);
  assert.equal(stored.currentStage, 'order_saved');
  assert.equal(stored.linkedOrderDocumentId, 'firestore-order-id');
  assert.equal(stored.writerUid, 'writer-1');
  assert.equal(stored.events.filter(({ eventId }) => eventId === orderSaved.event.eventId).length, 1);
});

test('PATCH requires the appended event timestamp to match and introduces order links only at order_saved', async () => {
  const timestampRepository = createMemoryRepository();
  const timestampHandler = createHandler(timestampRepository);
  await request(timestampHandler, 'POST', createBody());
  const updatedAt = new Date(NOW.getTime() + 2_000).toISOString();
  const mismatchedTimestamp = await request(timestampHandler, 'PATCH', patchBody('details_validated', {
    updatedAt,
    event: event('details_validated', {
      suffix: 'timestamp',
      occurredAt: new Date(NOW.getTime() + 1_000).toISOString(),
    }),
  }));

  const linkRepository = createMemoryRepository();
  const linkHandler = createHandler(linkRepository);
  await request(linkHandler, 'POST', createBody());
  const prematureLink = await request(linkHandler, 'PATCH', patchBody('details_validated', {
    suffix: 'premature-link',
    linkedOrderDocumentId: 'firestore-order-id',
    linkedOrderId: 'RPH-20260720-ABC123',
  }));

  assert.equal(mismatchedTimestamp.status, 400);
  assert.equal(mismatchedTimestamp.body.error.code, 'event-mismatch');
  assert.equal(prematureLink.status, 400);
  assert.equal(prematureLink.body.error.code, 'invalid-order-link');
});

test('independently verifies optional primary identity and rejects extra PII or stale identity', async () => {
  const verifiedTokens = [];
  const repository = createMemoryRepository();
  const handler = createHandler(repository, {
    verifyIdToken: async (token) => {
      verifiedTokens.push(token);
      return verifyTestIdToken(token);
    },
  });

  const missingPrimaryToken = await request(handler, 'POST', createBody({ userId: 'user-123' }));
  const wrongUid = await request(handler, 'POST', createBody({ userId: 'user-123' }), {
    headers: { [CHECKOUT_PRIMARY_USER_TOKEN_HEADER]: 'wrong-primary-token' },
  });
  const extraPii = await request(handler, 'POST', createBody({
    customer: {
      name: 'Anu', phone: '919876543210', whatsapp: '919988776655',
      email: 'private@example.com', address: 'Rose Lane', pincode: '682001',
    },
  }), { headers: { [CHECKOUT_PRIMARY_USER_TOKEN_HEADER]: PRIMARY_TOKEN } });
  const accepted = await request(handler, 'POST', createBody({ userId: 'user-123' }), {
    headers: { [CHECKOUT_PRIMARY_USER_TOKEN_HEADER]: PRIMARY_TOKEN },
  });

  assert.equal(missingPrimaryToken.status, 401);
  assert.equal(missingPrimaryToken.body.error.code, 'primary-id-token-required');
  assert.equal(wrongUid.status, 403);
  assert.equal(wrongUid.body.error.code, 'user-id-mismatch');
  assert.equal(extraPii.status, 400);
  assert.equal(accepted.status, 201);
  assert.equal(verifiedTokens.filter((token) => token === WRITER_TOKEN).length, 4);
  assert.deepEqual(
    verifiedTokens.filter((token) => token !== WRITER_TOKEN),
    ['wrong-primary-token', PRIMARY_TOKEN],
  );
  assert.equal(repository.documents.get(ATTEMPT_ID).userId, 'user-123');
  assert.deepEqual(Object.keys(repository.documents.get(ATTEMPT_ID).customer).sort(), ['name', 'phone', 'whatsapp']);
});

test('validates methods, JSON content, bounded bodies, exact expiry, and stable retry classes', async () => {
  const repository = createMemoryRepository();
  const handler = createHandler(repository);

  const method = await handler({ method: 'DELETE', headers: {}, body: {} });
  const mediaType = await handler({ method: 'POST', headers: {}, body: createBody() });
  const expiry = await request(handler, 'POST', createBody({
    expiresAt: new Date(NOW.getTime() + CHECKOUT_RETENTION_MS - 1).toISOString(),
  }));
  const oversized = await request(handler, 'POST', createBody({
    customer: { name: 'a'.repeat(40_000), phone: '', whatsapp: '' },
  }));

  assert.equal(method.status, 405);
  assert.equal(method.headers.allow, 'POST, PATCH');
  assert.equal(mediaType.status, 415);
  assert.equal(expiry.status, 400);
  assert.equal(oversized.status, 413);
  assert.equal(classifyCheckoutAttemptResponse(204), 'success');
  assert.equal(classifyCheckoutAttemptResponse(400), 'permanent');
  assert.equal(classifyCheckoutAttemptResponse(429), 'retryable');
  assert.equal(classifyCheckoutAttemptResponse(503), 'retryable');
});
