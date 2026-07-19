import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createCheckoutTrackerSession } from '../src/services/checkoutAttemptService.js';
import { runVerifiedCheckout } from '../src/services/verifiedCheckout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const whatsappCheckoutSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'services', 'whatsappCheckout.js'),
  'utf8'
);

let adapterModuleIndex = 0;

async function loadWhatsAppCheckoutAdapter(overrides = {}) {
  const dependencyKey = `__whatsappCheckoutTestDependencies${++adapterModuleIndex}`;
  globalThis[dependencyKey] = {
    createOrder: async () => {},
    generateOrderId: () => 'RPH-TEST',
    getOrderByIdFromServer: async () => {},
    getOrderUrl: () => '',
    incrementPromoUsage: async () => {},
    openExternalUrl: async () => {},
    generateWhatsAppOrderRequestUrl: () => '',
    runVerifiedCheckout: async () => {},
    createCheckoutTracker: async () => ({
      attemptId: 'attempt-runtime',
      supportCode: 'CHK-RUNTIME',
    }),
    ...overrides,
  };

  const dependencyNames = [
    'createOrder',
    'generateOrderId',
    'getOrderByIdFromServer',
    'getOrderUrl',
    'incrementPromoUsage',
    'openExternalUrl',
    'generateWhatsAppOrderRequestUrl',
    'runVerifiedCheckout',
    'createCheckoutTracker',
  ];
  const executableSource = whatsappCheckoutSource
    .replace(/^import[^\n]*\r?\n/gm, '')
    .replaceAll('export ', '');
  const moduleSource = [
    `const { ${dependencyNames.join(', ')} } = globalThis.${dependencyKey};`,
    executableSource,
    'export { initiateWhatsAppCheckout };',
  ].join('\n');

  try {
    return await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
  } finally {
    delete globalThis[dependencyKey];
  }
}

async function captureAdapterRejection(failure) {
  const adapter = await loadWhatsAppCheckoutAdapter({
    runVerifiedCheckout: async () => {
      throw failure;
    },
  });
  const originalError = console.error;
  console.error = () => {};

  try {
    await adapter.initiateWhatsAppCheckout([], 0, {}, null, null);
    assert.fail('Expected checkout adapter to reject');
  } catch (error) {
    return error;
  } finally {
    console.error = originalError;
  }
}

test('checkout tracker support identifiers flow through verified checkout results', async () => {
  const persistedUpdates = [];
  let uuidIndex = 0;
  const tracker = await createCheckoutTrackerSession({
    cartItems: [{ productId: 'P1', name: 'Aloe', price: 150, quantity: 1 }],
    total: 150,
    userInfo: { name: 'Anu' },
    userId: null,
  }, {
    generators: {
      randomUUID: () => `00000000-0000-4000-8000-${String(++uuidIndex).padStart(12, '0')}`,
      now: () => new Date('2026-07-19T10:00:00.000Z'),
    },
    persistCreate: async () => {},
    persistUpdate: async (operation) => persistedUpdates.push(operation.payload),
  });
  const order = { id: 'order-document', orderId: 'RPH-ORDER-1' };

  const result = await runVerifiedCheckout({
    cartItems: [{ productId: 'P1', name: 'Aloe', price: 150, quantity: 1 }],
    total: 150,
    userInfo: { name: 'Anu' },
    userId: null,
    promoInfo: null,
  }, {
    generateOrderId: () => order.orderId,
    createOrder: async () => order,
    verifyOrder: async () => order,
    getOrderUrl: () => 'https://example.com/order/order-document',
    buildWhatsAppUrl: () => 'https://wa.me/example',
    incrementPromoUsage: () => {},
    openExternalUrl: async () => {},
    tracker,
  });

  assert.equal(result.attemptId, tracker.attemptId);
  assert.equal(result.supportCode, tracker.supportCode);
  assert.deepEqual(
    persistedUpdates.map((update) => update.currentStage).filter(Boolean),
    ['details_validated', 'order_saved', 'order_verified', 'whatsapp_opened', 'completed']
  );
  assert.equal(persistedUpdates.at(-1).result, 'successful');
});

test('production adapter creates and passes a tracker and annotates the original business error', () => {
  assert.match(
    whatsappCheckoutSource,
    /import \{ createCheckoutTracker \} from ['"]\.\/checkoutAttemptService['"]/
  );
  assert.match(
    whatsappCheckoutSource,
    /createCheckoutTracker\(\{\s*cartItems,\s*total,\s*userInfo,\s*userId,?\s*\}\)/
  );
  assert.match(whatsappCheckoutSource, /runVerifiedCheckout\([\s\S]*?tracker,?[\s\S]*?\)/);
  assert.match(whatsappCheckoutSource, /error\.attemptId\s*=\s*tracker\?\.attemptId/);
  assert.match(whatsappCheckoutSource, /error\.supportCode\s*=\s*tracker\?\.supportCode/);
  assert.match(
    whatsappCheckoutSource,
    /error\.supportCode\s*=\s*tracker\?\.supportCode[\s\S]*?throw error;/
  );
});

test('production adapter preserves a primitive business failure value', async () => {
  const failure = 'checkout failed as a primitive';

  const rejection = await captureAdapterRejection(failure);

  assert.equal(rejection, failure);
});

test('production adapter preserves a frozen business failure object by identity', async () => {
  const failure = Object.freeze({ code: 'frozen-checkout-failure' });

  const rejection = await captureAdapterRejection(failure);

  assert.strictEqual(rejection, failure);
  assert.deepEqual(rejection, { code: 'frozen-checkout-failure' });
});
