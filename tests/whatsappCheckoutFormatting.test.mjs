import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWhatsAppCheckoutMessage } from '../src/utils/whatsappCheckoutMessage.js';

const cartItems = [
  { productId: '12', name: 'Jade Plant', price: 120, quantity: 2 },
];

test('WhatsApp checkout message includes a view order link when a public URL exists', () => {
  const message = buildWhatsAppCheckoutMessage(
    cartItems,
    240,
    { name: 'Customer' },
    'https://rosaryplanthouse.com/order/abc',
    'RPH-20260705-ABC123',
    null,
    'INR '
  );

  assert.match(message, /\*View Order:\* https:\/\/rosaryplanthouse\.com\/order\/abc/);
  assert.match(message, /Order ID: RPH-20260705-ABC123/);
});

test('WhatsApp checkout message can be generated without an order URL fallback', () => {
  const message = buildWhatsAppCheckoutMessage(
    cartItems,
    240,
    { name: 'Customer' },
    '',
    'RPH-20260705-ABC123',
    null,
    'INR '
  );

  assert.doesNotMatch(message, /\*View Order:\*/);
  assert.match(message, /Order ID: RPH-20260705-ABC123/);
});
