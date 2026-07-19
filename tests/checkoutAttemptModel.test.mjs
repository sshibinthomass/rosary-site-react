import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCheckoutAttempt,
  createCheckoutEvent,
  filterCheckoutAttempts,
  sanitizeCheckoutError,
} from '../src/utils/checkoutAttemptModel.js';

const fixedGenerators = {
  randomUUID: () => 'document-123',
  randomBytes: () => Uint8Array.from([7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76, 79, 82, 85, 88, 91, 94, 97, 100]),
  now: () => new Date('2026-07-19T12:00:00.000Z'),
};

const input = {
  customer: { name: 'Anu', phone: '+91 98765 43210', email: 'anu@example.com' },
  delivery: { phone: '(919) 876-543-210' },
  orderId: 'ORD-100',
  totalAmount: '137',
  items: [{ id: '49', name: 'Hydrangea', price: '39', quantity: '1', ignored: 'nope' }],
};

test('creates a complete 180-day checkout attempt snapshot', () => {
  const attempt = createCheckoutAttempt(input, fixedGenerators);

  assert.equal(attempt.id, 'document-123');
  assert.equal(attempt.supportCode, 'CHK-7K2M9Q');
  assert.notEqual(attempt.clientToken, attempt.id);
  assert.equal(attempt.customer.name, 'Anu');
  assert.equal(attempt.customer.phone, '919876543210');
  assert.equal(attempt.customer.phoneSearch, '919876543210');
  assert.equal(attempt.delivery.phone, '919876543210');
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

const attempts = [
  { id: '1', supportCode: 'CHK-AAAAAA', orderId: 'ORD-1', customer: { name: 'Anu', phoneSearch: '919876543210' }, result: 'failed', currentStage: 'order_saved', resolutionStatus: 'open', createdAt: '2026-07-10T10:00:00.000Z' },
  { id: '2', supportCode: 'CHK-BBBBBB', orderId: 'ORD-2', customer: { name: 'Bala', phoneSearch: '447700900123' }, delivery: { whatsappPhone: '+91 99999 88888' }, result: 'successful', currentStage: 'completed', resolutionStatus: 'investigating', createdAt: '2026-07-18T10:00:00.000Z' },
  { id: '3', supportCode: 'CHK-CCCCCC', orderId: 'ORD-3', customer: { name: 'Cia', phoneSearch: '12025550123' }, result: 'failed', currentStage: 'started', resolutionStatus: 'resolved', createdAt: '2026-07-19T10:00:00.000Z' },
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
