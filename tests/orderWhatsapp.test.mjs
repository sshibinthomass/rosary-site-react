import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWhatsAppUrlForOrder } from '../src/utils/orderWhatsApp.js';

test('buildWhatsAppUrlForOrder sends an existing pending order to WhatsApp with its order link', () => {
  const url = buildWhatsAppUrlForOrder(
    {
      id: 'order-doc-123',
      orderId: 'RPH-20260706-FNFM0W',
      customer: {
        name: 'Anu',
        phone: '9876543210',
        whatsapp: '9876543210',
        address: 'Rose Villa',
        district: 'Kochi',
        state: 'Kerala',
        pincode: '682001',
      },
      items: [
        { productId: 'P101', name: 'Jade Plant', price: 250, quantity: 2 },
        { productId: 'L7', name: 'Rare Haworthia', price: 500, quantity: 1 },
      ],
      totalAmount: 1000,
      promoCode: 'PLANT10',
      discountAmount: 100,
      discountType: 'percentage',
      discountValue: 10,
    },
    'https://rosaryplanthouse.com/order/order-doc-123'
  );

  assert.match(url, /^https:\/\/wa\.me\/917904050237\?text=/);

  const message = new URL(url).searchParams.get('text');
  assert.match(message, /Order ID: RPH-20260706-FNFM0W/);
  assert.match(message, /\*View Order:\* https:\/\/rosaryplanthouse\.com\/order\/order-doc-123/);
  assert.match(message, /P101\. Jade Plant/);
  assert.match(message, /L7\. Rare Haworthia/);
  assert.match(message, /Promo Code: PLANT10 \(10% off\)/);
  assert.match(message, /Name: Anu/);
  assert.match(message, /WhatsApp: 9876543210/);
});

test('buildWhatsAppUrlForOrder falls back to the document id when no display order id exists', () => {
  const url = buildWhatsAppUrlForOrder({
    id: 'doc-only-order',
    customer: { name: 'Customer' },
    items: [{ productId: 'P1', name: 'Aloe', price: 150, quantity: 1 }],
    totalAmount: 150,
    orderUrl: 'https://rosaryplanthouse.com/order/doc-only-order',
  });

  const message = new URL(url).searchParams.get('text');
  assert.match(message, /Order ID: doc-only-order/);
  assert.match(message, /\*View Order:\* https:\/\/rosaryplanthouse\.com\/order\/doc-only-order/);
});
