import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCheckoutAttempt,
  createCheckoutEvent,
  filterCheckoutAttempts,
  getCheckoutAttemptLinkedOrder,
  sanitizeCheckoutError,
} from '../src/utils/checkoutAttemptModel.js';
import * as checkoutAttemptModel from '../src/utils/checkoutAttemptModel.js';

const fixedGenerators = {
  randomUUID: () => 'document-123',
  randomBytes: () => Uint8Array.from([7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76, 79, 82, 85, 88, 91, 94, 97, 100]),
  now: () => new Date('2026-07-19T12:00:00.000Z'),
};

const input = {
  customer: {
    name: 'Anu', phone: '+91 98765 43210', email: 'anu@example.com',
    credentials: { password: 'secret' }, firebaseConfig: { apiKey: 'secret' }, stack: 'private',
  },
  delivery: {
    name: 'Anu', phone: '(919) 876-543-210', whatsapp: '+91 99887 76655',
    address: 'Rose Lane', pincode: '682001', district: 'Ernakulam', state: 'Kerala',
    credentials: { token: 'secret' }, firebaseConfig: { apiKey: 'secret' }, stack: 'private',
  },
  orderId: 'ORD-100',
  totalAmount: '137',
  items: [{ id: '49', name: 'Hydrangea', price: '39', quantity: '1', ignored: 'nope' }],
};

test('creates a complete 180-day checkout attempt snapshot', () => {
  const attempt = createCheckoutAttempt(input, fixedGenerators);

  assert.equal(attempt.id, 'document-123');
  assert.equal(attempt.supportCode, 'CHK-7K2M9Q');
  assert.notEqual(attempt.capabilityToken, attempt.id);
  assert.equal(attempt.capabilityToken.length, 64);
  assert.equal(attempt.customer.name, 'Anu');
  assert.equal(attempt.customer.phone, '919876543210');
  assert.equal(attempt.customer.whatsapp, '919988776655');
  assert.deepEqual(Object.keys(attempt.customer).sort(), ['name', 'phone', 'whatsapp']);
  assert.equal('delivery' in attempt, false);
  assert.doesNotMatch(
    JSON.stringify(attempt.customer),
    /email|address|pincode|district|state|credentials|firebaseConfig|apiKey|stack|secret/i,
  );
  assert.equal(attempt.totalAmount, 137);
  assert.deepEqual(attempt.items[0], {
    productId: '49', name: 'Hydrangea', price: 39, quantity: 1,
  });
  assert.equal(attempt.currentStage, 'started');
  assert.equal(attempt.result, 'in_progress');
  assert.equal(attempt.resolutionStatus, 'open');
  assert.equal(attempt.createdAt, '2026-07-19T12:00:00.000Z');
  assert.equal(attempt.expiresAt, '2027-01-15T12:00:00.000Z');
});

test('keeps checkout item snapshots primitive, bounded, and free of nested input data', () => {
  const attempt = createCheckoutAttempt({
    ...input,
    items: Array.from({ length: 55 }, (_, index) => ({
      id: index,
      name: index === 0 ? { credentials: 'secret' } : `Plant ${index}`,
      price: index === 0 ? 'not-a-number' : index,
      quantity: index === 0 ? Infinity : 1,
      firebaseConfig: { apiKey: 'secret' },
    })),
  }, fixedGenerators);

  assert.equal(attempt.items.length, 20);
  assert.deepEqual(Object.keys(attempt.items[0]).sort(), ['name', 'price', 'productId', 'quantity']);
  assert.equal(typeof attempt.items[0].name, 'string');
  assert.equal(attempt.items[0].price, 0);
  assert.equal(attempt.items[0].quantity, 0);
  assert.doesNotMatch(JSON.stringify(attempt.items), /credentials|firebaseConfig|apiKey|secret/i);
});

test('normalizes null checkout items without throwing', () => {
  const attempt = createCheckoutAttempt({ ...input, items: [null] }, fixedGenerators);

  assert.deepEqual(attempt.items, []);
});

test('caps checkout monetary and quantity primitives to Firestore rule bounds', () => {
  const attempt = createCheckoutAttempt({
    ...input,
    totalAmount: Number.MAX_VALUE,
    items: [{ id: 'plant-1', name: 'Plant', price: Number.MAX_VALUE, quantity: Number.MAX_VALUE }],
  }, fixedGenerators);

  assert.equal(attempt.totalAmount, 1_000_000_000);
  assert.equal(attempt.items[0].price, 1_000_000_000);
  assert.equal(attempt.items[0].quantity, 1_000_000);
});

test('creates checkout events with defaults and optional safe error detail', () => {
  const event = createCheckoutEvent('order_saved', { eventId: 'evt-1', error: { code: 'unavailable', message: 'connection lost' } }, () => new Date('2026-07-19T13:00:00.000Z'));

  assert.deepEqual(event, {
    eventId: 'evt-1',
    stage: 'order_saved',
    outcome: 'success',
    occurredAt: '2026-07-19T13:00:00.000Z',
    error: {
      category: 'network',
      code: 'unavailable',
      message: 'A network problem interrupted checkout.',
    },
  });
});

test('sanitizes event errors to allowlisted diagnostic fields', () => {
  const event = createCheckoutEvent('order_saved', {
    error: {
      code: `permission-denied apiKey=secret ${'x'.repeat(300)}`,
      message: 'stack=trace firebaseConfig={"apiKey":"secret"}',
      stack: 'private stack trace',
      credentials: { password: 'secret' },
      arbitrary: 'must not persist',
    },
  }, () => new Date('2026-07-19T13:00:00.000Z'));

  assert.deepEqual(event.error, {
    category: 'permission',
    code: 'unknown',
    message: 'Checkout diagnostic access was denied.',
  });
  assert.doesNotMatch(JSON.stringify(event.error), /stack|apiKey|firebaseConfig|credentials|secret|arbitrary/i);
});

for (const [name, error, expected] of [
  ['Firebase permission', { code: 'permission-denied', message: 'missing permission' }, { category: 'permission', code: 'permission-denied' }],
  ['network', { code: 'unavailable', message: 'network unavailable' }, { category: 'network', code: 'unavailable' }],
  ['verification', { code: 'verification-failed', message: 'verification did not pass' }, { category: 'verification', code: 'verification-failed' }],
  ['WhatsApp launch', { code: 'whatsapp-launch-failed', message: 'WhatsApp could not launch' }, { category: 'whatsapp', code: 'whatsapp-launch-failed' }],
  ['validation', { code: 'invalid-argument', message: 'phone is required' }, { category: 'validation', code: 'invalid-argument' }],
  ['unknown', { code: 'unexpected', message: 'boom' }, { category: 'unknown', code: 'unknown' }],
]) {
  test(`sanitizes ${name} errors`, () => {
    const sanitized = sanitizeCheckoutError(error);
    assert.equal(sanitized.category, expected.category);
    assert.equal(sanitized.code, expected.code);
    assert.ok(sanitized.message.length <= 240);
    assert.doesNotMatch(sanitized.message, /stack|apiKey|\{\s*"/i);
  });
}

test('sanitizes untrusted error content without serializing objects', () => {
  const sanitized = sanitizeCheckoutError({
    code: 'unknown',
    message: `apiKey=secret stack=trace ${'x'.repeat(300)} {"token":"hidden"}`,
  });

  assert.ok(sanitized.message.length <= 240);
  assert.doesNotMatch(sanitized.message, /stack|apiKey|\{\s*"/i);
});

test('normalizes untrusted error codes to a bounded generic fallback', () => {
  const sanitized = sanitizeCheckoutError({
    code: `permission-denied apiKey=secret ${'x'.repeat(500)}`,
    message: 'request blocked',
  });

  assert.equal(sanitized.category, 'permission');
  assert.equal(sanitized.code, 'unknown');
  assert.ok(sanitized.code.length <= 64);
  assert.doesNotMatch(sanitized.code, /apiKey|secret/i);
});

test('stable boundary codes take precedence over misleading generic messages', () => {
  assert.deepEqual(sanitizeCheckoutError({
    code: 'whatsapp-launch-failed',
    message: 'A network-looking plugin rejection occurred.',
  }), {
    category: 'whatsapp',
    code: 'whatsapp-launch-failed',
    message: 'WhatsApp could not be opened.',
  });
  assert.deepEqual(sanitizeCheckoutError({
    code: 'verification-failed',
    message: 'Network response contained a mismatched order.',
  }), {
    category: 'verification',
    code: 'verification-failed',
    message: 'Checkout verification did not complete.',
  });
});

const attempts = [
  { id: '1', supportCode: 'CHK-AAAAAA', orderId: 'ORD-1', customer: { name: 'Anu', phoneSearch: '919876543210' }, result: 'failed', currentStage: 'order_saved', resolutionStatus: 'open', createdAt: '2026-07-10T10:00:00.000Z' },
  { id: '2', supportCode: 'CHK-BBBBBB', linkedOrderId: 'ORD-2', linkedOrderDocumentId: 'document-2', customer: { name: 'Bala', phone: '447700900123', whatsapp: '919999988888' }, result: 'successful', currentStage: 'completed', resolutionStatus: 'investigating', createdAt: '2026-07-18T10:00:00.000Z' },
  { id: '3', supportCode: 'CHK-CCCCCC', linkedOrderId: 'ORD-3', linkedOrderDocumentId: 'document-3', customer: { name: 'Cia', phone: '12025550123', whatsapp: '' }, result: 'failed', currentStage: 'started', resolutionStatus: 'resolved', createdAt: '2026-07-19T10:00:00.000Z' },
];

for (const [name, filters, expectedIds] of [
  ['support code', { query: 'bbbbbb' }, ['2']],
  ['order ID', { query: 'ord-1' }, ['1']],
  ['customer name', { query: 'anu' }, ['1']],
  ['normalized phone', { query: '+44 7700 900123' }, ['2']],
  ['delivery WhatsApp contact', { query: '+91 99999 88888' }, ['2']],
  ['result', { result: 'failed' }, ['1']],
  ['stage', { stage: 'completed' }, ['2']],
  ['resolution status', { resolutionStatus: 'investigating' }, ['2']],
  ['date range', { from: '2026-07-15', to: '2026-07-18T23:59:59.999Z' }, ['2']],
  ['resolved records when requested', { includeResolved: true, resolutionStatus: 'resolved' }, ['3']],
]) {
  test(`filters checkout attempts by ${name}`, () => {
    assert.deepEqual(filterCheckoutAttempts(attempts, filters).map(({ id }) => id), expectedIds);
  });
}

test('excludes resolved attempts and sorts remaining attempts newest first by default', () => {
  assert.deepEqual(filterCheckoutAttempts(attempts, {}).map(({ id }) => id), ['2', '1']);
});

test('resolves canonical linked-order identifiers from current and legacy tracker shapes', () => {
  assert.deepEqual(getCheckoutAttemptLinkedOrder({
    linkedOrderId: 'RPH-CURRENT',
    linkedOrderDocumentId: 'document-current',
    orderId: 'RPH-LEGACY-IGNORED',
  }), {
    businessOrderId: 'RPH-CURRENT',
    documentId: 'document-current',
    displayId: 'RPH-CURRENT',
    searchValues: ['RPH-CURRENT', 'RPH-LEGACY-IGNORED', 'document-current'],
  });
  assert.deepEqual(getCheckoutAttemptLinkedOrder({ orderId: 'legacy-order-reference' }), {
    businessOrderId: 'legacy-order-reference',
    documentId: 'legacy-order-reference',
    displayId: 'legacy-order-reference',
    searchValues: ['legacy-order-reference'],
  });
});

test('explicit support-code or order query searches can include resolved attempts', () => {
  assert.deepEqual(
    filterCheckoutAttempts(attempts, { query: 'ORD-3', includeResolvedForQuery: true }).map(({ id }) => id),
    ['3'],
  );
  assert.deepEqual(
    filterCheckoutAttempts(attempts, { query: 'CHK-CCCCCC', includeResolvedForQuery: true }).map(({ id }) => id),
    ['3'],
  );
  assert.deepEqual(filterCheckoutAttempts(attempts, { query: 'ORD-3' }), []);
});

test('parses date-only filter bounds at the start and end of the browser-local day', () => {
  const parseCheckoutFilterDate = checkoutAttemptModel.parseCheckoutFilterDate;
  assert.equal(typeof parseCheckoutFilterDate, 'function');

  const start = parseCheckoutFilterDate('2026-07-18', false);
  const end = parseCheckoutFilterDate('2026-07-18', true);
  assert.deepEqual(
    [start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds()],
    [2026, 6, 18, 0, 0, 0, 0],
  );
  assert.deepEqual(
    [end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds()],
    [2026, 6, 18, 23, 59, 59, 999],
  );
});

test('date-only filters include both local-day boundaries and exclude adjacent instants', () => {
  const start = new Date(2026, 6, 18, 0, 0, 0, 0);
  const end = new Date(2026, 6, 18, 23, 59, 59, 999);
  const records = [
    { id: 'before', resolutionStatus: 'open', createdAt: new Date(start.getTime() - 1).toISOString() },
    { id: 'start', resolutionStatus: 'open', createdAt: start.toISOString() },
    { id: 'end', resolutionStatus: 'open', createdAt: end.toISOString() },
    { id: 'after', resolutionStatus: 'open', createdAt: new Date(end.getTime() + 1).toISOString() },
  ];

  assert.deepEqual(
    filterCheckoutAttempts(records, { from: '2026-07-18', to: '2026-07-18' }).map(({ id }) => id),
    ['end', 'start'],
  );
});
