import assert from 'node:assert/strict';
import test from 'node:test';

import { runVerifiedCheckout } from '../src/services/verifiedCheckout.js';

const checkoutInput = {
  cartItems: [
    { productId: '49', name: 'Hydrangea macrophylla', price: 39, quantity: 1 },
    { productId: '2', name: 'Bergeranthus multiceps', price: 49, quantity: 2 },
  ],
  total: 137,
  userInfo: { name: 'Customer' },
  userId: null,
  promoInfo: { code: 'GREEN10', discount: 10, type: 'fixed', value: 10 },
};

function createDependencies({ verifiedOrder } = {}) {
  const events = [];
  const createdOrder = {
    id: 'p9IhfP2nJsgsx6S5Kx1r',
    orderId: 'RPH-20260515-FQ3UXJ',
    items: checkoutInput.cartItems,
  };

  return {
    events,
    createdOrder,
    dependencies: {
      generateOrderId: () => createdOrder.orderId,
      createOrder: async (orderInput) => {
        events.push('create');
        assert.equal(orderInput.orderId, createdOrder.orderId);
        assert.equal(orderInput.originalAmount, 137);
        return createdOrder;
      },
      verifyOrder: async (documentId) => {
        events.push('verify');
        assert.equal(documentId, createdOrder.id);
        return verifiedOrder === undefined ? createdOrder : verifiedOrder;
      },
      getOrderUrl: (documentId) => `https://rosaryplanthouse.com/order/${documentId}`,
      buildWhatsAppUrl: (_items, _total, _userInfo, orderUrl, orderId) => {
        assert.equal(orderUrl, `https://rosaryplanthouse.com/order/${createdOrder.id}`);
        assert.equal(orderId, createdOrder.orderId);
        return 'https://wa.me/917904050237?text=verified-order';
      },
      incrementPromoUsage: (code) => {
        events.push('promo');
        assert.equal(code, 'GREEN10');
      },
      openExternalUrl: async (url) => {
        events.push('open');
        assert.equal(url, 'https://wa.me/917904050237?text=verified-order');
      },
    },
  };
}

test('checkout verifies the exact persisted order before promo usage and WhatsApp handoff', async () => {
  const { events, createdOrder, dependencies } = createDependencies();

  const result = await runVerifiedCheckout(checkoutInput, dependencies);

  assert.deepEqual(events, ['create', 'verify', 'promo', 'open']);
  assert.deepEqual(result, {
    order: createdOrder,
    orderUrl: `https://rosaryplanthouse.com/order/${createdOrder.id}`,
    whatsappUrl: 'https://wa.me/917904050237?text=verified-order',
    savedToFirestore: true,
  });
});

for (const [label, verifiedOrder] of [
  ['missing server document', null],
  ['different document id', { id: 'another-document', orderId: 'RPH-20260515-FQ3UXJ' }],
  ['different business order id', { id: 'p9IhfP2nJsgsx6S5Kx1r', orderId: 'RPH-OTHER' }],
]) {
  test(`checkout rejects a ${label} before promo usage or WhatsApp handoff`, async () => {
    const { events, dependencies } = createDependencies({ verifiedOrder });

    await assert.rejects(
      runVerifiedCheckout(checkoutInput, dependencies),
      /could not be verified after saving/i
    );

    assert.deepEqual(events, ['create', 'verify']);
  });
}

test('checkout skips promo usage when no promo code was supplied', async () => {
  const { events, dependencies } = createDependencies();

  await runVerifiedCheckout({ ...checkoutInput, promoInfo: null }, dependencies);

  assert.deepEqual(events, ['create', 'verify', 'open']);
});
