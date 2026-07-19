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
