import assert from 'node:assert/strict';
import test from 'node:test';

import { runVerifiedCheckout } from '../src/services/verifiedCheckout.js';
import { createExternalNavigation } from '../src/utils/externalNavigation.js';

const externalUrlReservation = {
  status: 'reserved',
  handle: { name: 'initial-checkout-window' },
};

const checkoutInput = {
  cartItems: [
    { productId: '49', name: 'Hydrangea macrophylla', price: 39, quantity: 1 },
    { productId: '2', name: 'Bergeranthus multiceps', price: 49, quantity: 2 },
  ],
  total: 137,
  userInfo: { name: 'Customer' },
  userId: null,
  promoInfo: { code: 'GREEN10', discount: 10, type: 'fixed', value: 10 },
  externalUrlReservation,
};

function createDependencies({ verifiedOrder } = {}) {
  const events = [];
  const trackerFailures = [];
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
      openExternalUrl: async (url, reservation) => {
        events.push('open');
        assert.equal(url, 'https://wa.me/917904050237?text=verified-order');
        assert.equal(reservation, externalUrlReservation);
      },
      closeExternalUrlReservation: (reservation) => {
        events.push('close');
        assert.equal(reservation, externalUrlReservation);
      },
      tracker: {
        attemptId: 'attempt-123',
        supportCode: 'CHK-ABC123',
        stage: async (stage) => {
          events.push(`track:${stage}`);
        },
        fail: async (error) => {
          trackerFailures.push(error);
          events.push('track:failed');
        },
        complete: async () => {
          events.push('track:completed');
        },
        recordWhatsAppRetry: async (retry) => {
          events.push(`track:retry:${retry.success ? 'success' : 'failed'}`);
        },
      },
    },
    trackerFailures,
  };
}

test('checkout verifies the exact persisted order before promo usage and WhatsApp handoff', async () => {
  const { events, createdOrder, dependencies } = createDependencies();

  const result = await runVerifiedCheckout(checkoutInput, dependencies);

  assert.deepEqual(events, [
    'track:details_validated', 'create', 'track:order_saved',
    'verify', 'track:order_verified', 'promo', 'open',
    'track:whatsapp_opened', 'track:completed',
  ]);
  assert.deepEqual(result, {
    order: createdOrder,
    orderUrl: `https://rosaryplanthouse.com/order/${createdOrder.id}`,
    whatsappUrl: 'https://wa.me/917904050237?text=verified-order',
    savedToFirestore: true,
    whatsappOpened: true,
    attemptId: 'attempt-123',
    supportCode: 'CHK-ABC123',
  });
});

test('verified checkout remains saved when WhatsApp cannot open', async () => {
  const { events, createdOrder, dependencies, trackerFailures } = createDependencies();
  const whatsappError = new Error('WhatsApp could not open');
  dependencies.openExternalUrl = async (url) => {
    events.push('open');
    assert.equal(url, 'https://wa.me/917904050237?text=verified-order');
    throw whatsappError;
  };

  const result = await runVerifiedCheckout(checkoutInput, dependencies);

  assert.deepEqual(events, [
    'track:details_validated', 'create', 'track:order_saved',
    'verify', 'track:order_verified', 'promo', 'open', 'track:failed',
  ]);
  assert.equal(trackerFailures.length, 1);
  assert.equal(trackerFailures[0].code, 'whatsapp-launch-failed');
  assert.equal(trackerFailures[0].cause, whatsappError);
  assert.deepEqual(result, {
    order: createdOrder,
    orderUrl: `https://rosaryplanthouse.com/order/${createdOrder.id}`,
    whatsappUrl: 'https://wa.me/917904050237?text=verified-order',
    savedToFirestore: true,
    whatsappOpened: false,
    whatsappError: 'WhatsApp could not open',
    attemptId: 'attempt-123',
    supportCode: 'CHK-ABC123',
  });
});

test('checkout reports create failures once and rethrows the original error', async () => {
  const { events, dependencies, trackerFailures } = createDependencies();
  const createError = new Error('Order save failed');
  dependencies.createOrder = async () => {
    events.push('create');
    throw createError;
  };

  await assert.rejects(
    runVerifiedCheckout(checkoutInput, dependencies),
    (error) => error === createError
  );

  assert.deepEqual(events, ['track:details_validated', 'create', 'close', 'track:failed']);
  assert.deepEqual(trackerFailures, [createError]);
});

test('checkout reports verification failures once and rethrows the original error', async () => {
  const { events, dependencies, trackerFailures } = createDependencies();
  const verificationError = new Error('Server verification failed');
  dependencies.verifyOrder = async () => {
    events.push('verify');
    throw verificationError;
  };

  await assert.rejects(
    runVerifiedCheckout(checkoutInput, dependencies),
    (error) => error.code === 'verification-failed' && error.cause === verificationError
  );

  assert.deepEqual(events, [
    'track:details_validated', 'create', 'track:order_saved',
    'verify', 'close', 'track:failed',
  ]);
  assert.equal(trackerFailures.length, 1);
  assert.equal(trackerFailures[0].code, 'verification-failed');
  assert.equal(trackerFailures[0].cause, verificationError);
});

for (const [label, verifiedOrder] of [
  ['missing server document', null],
  ['different document id', { id: 'another-document', orderId: 'RPH-20260515-FQ3UXJ' }],
  ['different business order id', { id: 'p9IhfP2nJsgsx6S5Kx1r', orderId: 'RPH-OTHER' }],
]) {
  test(`checkout rejects a ${label} before promo usage or WhatsApp handoff`, async () => {
    const { events, dependencies, trackerFailures } = createDependencies({ verifiedOrder });

    await assert.rejects(
      runVerifiedCheckout(checkoutInput, dependencies),
      /could not be verified after saving/i
    );

    assert.deepEqual(events, [
      'track:details_validated', 'create', 'track:order_saved',
      'verify', 'close', 'track:failed',
    ]);
    assert.equal(trackerFailures.length, 1);
    assert.match(trackerFailures[0].message, /could not be verified after saving/i);
    assert.equal(trackerFailures[0].code, 'verification-failed');
  });
}

test('generic native launcher rejection is classified at the WhatsApp boundary', async () => {
  const { dependencies, trackerFailures } = createDependencies();
  const nativeError = new Error('plugin rejected');
  dependencies.openExternalUrl = async () => { throw nativeError; };

  const result = await runVerifiedCheckout(checkoutInput, dependencies);

  assert.equal(result.whatsappOpened, false);
  assert.equal(trackerFailures.length, 1);
  assert.equal(trackerFailures[0].code, 'whatsapp-launch-failed');
  assert.equal(trackerFailures[0].cause, nativeError);
});

test('a blocked initial reservation remains a saved order with truthful retry state', async () => {
  let browserOpenCalls = 0;
  const navigation = createExternalNavigation({
    isNativePlatform: () => false,
    openBrowser: () => {
      browserOpenCalls += 1;
      return null;
    },
    openNative: async () => assert.fail('native launcher must not run'),
  });
  const reservation = navigation.reserveExternalUrlWindow();
  const { dependencies, createdOrder, trackerFailures } = createDependencies();
  dependencies.openExternalUrl = navigation.openExternalUrl;

  const result = await runVerifiedCheckout({
    ...checkoutInput,
    externalUrlReservation: reservation,
  }, dependencies);

  assert.equal(result.order, createdOrder);
  assert.equal(result.savedToFirestore, true);
  assert.equal(result.whatsappOpened, false);
  assert.equal(typeof result.recordWhatsAppRetry, 'function');
  assert.equal(trackerFailures[0].code, 'whatsapp-launch-failed');
  assert.equal(browserOpenCalls, 1);
});

test('a business failure closes the exact reserved browser window before reporting failure', async () => {
  let closeCalls = 0;
  const browserWindow = {
    opener: {},
    location: { href: 'about:blank' },
    close() { closeCalls += 1; },
  };
  const navigation = createExternalNavigation({
    isNativePlatform: () => false,
    openBrowser: () => browserWindow,
    openNative: async () => assert.fail('native launcher must not run'),
  });
  const reservation = navigation.reserveExternalUrlWindow();
  const { dependencies } = createDependencies();
  dependencies.createOrder = async () => { throw new Error('Order save failed'); };
  dependencies.closeExternalUrlReservation = navigation.closeExternalUrlReservation;

  await assert.rejects(runVerifiedCheckout({
    ...checkoutInput,
    externalUrlReservation: reservation,
  }, dependencies), /Order save failed/);

  assert.equal(reservation.handle, browserWindow);
  assert.equal(closeCalls, 1);
});

test('only a failed WhatsApp handoff exposes an opaque non-persisted retry callback for the same tracker', async () => {
  const successfulCheckout = createDependencies();
  const successfulResult = await runVerifiedCheckout(checkoutInput, successfulCheckout.dependencies);
  assert.equal(successfulResult.recordWhatsAppRetry, undefined);

  const { events, dependencies } = createDependencies();
  dependencies.openExternalUrl = async () => {
    events.push('open');
    throw new Error('blocked');
  };
  const result = await runVerifiedCheckout(checkoutInput, dependencies);

  assert.equal(typeof result.recordWhatsAppRetry, 'function');
  assert.equal(Object.keys(result).includes('recordWhatsAppRetry'), false);
  assert.doesNotMatch(JSON.stringify(result), /writerIdToken|primaryUserIdToken|clientWriteToken/);

  await result.recordWhatsAppRetry({ success: false, error: new Error('still blocked') });
  assert.equal(events.at(-1), 'track:retry:failed');
});

test('checkout skips promo usage when no promo code was supplied', async () => {
  const { events, dependencies } = createDependencies();

  await runVerifiedCheckout({ ...checkoutInput, promoInfo: null }, dependencies);

  assert.deepEqual(events, [
    'track:details_validated', 'create', 'track:order_saved',
    'verify', 'track:order_verified', 'open',
    'track:whatsapp_opened', 'track:completed',
  ]);
});

test('tracker callback failures do not change checkout behavior or business callback order', async () => {
  const { events, createdOrder, dependencies } = createDependencies();
  const trackingMethods = [];
  const warnings = [];
  dependencies.tracker = {
    attemptId: 'attempt-isolated',
    supportCode: 'CHK-SAFE01',
    stage: async (stage) => {
      trackingMethods.push(`stage:${stage}`);
      throw new Error(`stage failed: ${stage}`);
    },
    fail: async () => {
      trackingMethods.push('fail');
      throw new Error('fail callback failed');
    },
    complete: async () => {
      trackingMethods.push('complete');
      throw new Error('complete callback failed');
    },
  };
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);

  try {
    const result = await runVerifiedCheckout(checkoutInput, dependencies);

    assert.deepEqual(events, ['create', 'verify', 'promo', 'open']);
    assert.deepEqual(trackingMethods, [
      'stage:details_validated',
      'stage:order_saved',
      'stage:order_verified',
      'stage:whatsapp_opened',
      'complete',
    ]);
    assert.equal(warnings.length, 5);
    assert.deepEqual(result, {
      order: createdOrder,
      orderUrl: `https://rosaryplanthouse.com/order/${createdOrder.id}`,
      whatsappUrl: 'https://wa.me/917904050237?text=verified-order',
      savedToFirestore: true,
      whatsappOpened: true,
      attemptId: 'attempt-isolated',
      supportCode: 'CHK-SAFE01',
    });
  } finally {
    console.warn = originalWarn;
  }
});
