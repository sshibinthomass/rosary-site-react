# Verified Order Checkout Design

## Problem

A customer received an order URL whose Firestore document did not exist in the production `orders` collection. The checkout currently treats a timed-out or failed Firestore save as a recoverable WhatsApp-only handoff. That makes the handoff look successful even though there is no durable order to open or administer. Order routes also defer Firebase Auth initialization for up to ten seconds, leaving the page blank before the lookup completes.

## Required behavior

- WhatsApp must open with an order URL only after the exact new Firestore document is confirmed by a server read.
- A save timeout, rejected write, missing verification document, or verification mismatch must fail checkout visibly.
- Failed checkout must keep the cart and delivery form intact and must not show the success panel, increment promo usage, or open WhatsApp.
- A successful checkout may increment promo usage, open WhatsApp, show the persistent confirmation panel, and clear the cart.
- Direct `/order/:orderId` visits must initialize authentication immediately so lookup does not wait for the general ten-second lazy-auth fallback.
- Web clients must activate an available PWA update promptly, reducing the period in which an old checkout bundle remains active after deployment.

## Design

### Server-confirmed order verification

`orderService` will expose a focused verification function using Firestore's server-only document read. It will return the saved order only when the document exists and its document ID and business order ID match the values returned by `createOrder`. Cache fallback is not accepted for this check.

`initiateWhatsAppCheckout` will:

1. create the pending order;
2. verify that exact order from the Firestore server;
3. build the order URL and WhatsApp message from the verified record;
4. increment promo usage only after verification;
5. open WhatsApp; and
6. return a successful result.

The existing save-timeout fallback will be removed. Any failure will reject the checkout and flow into the existing cart error handling. No order URL will be generated from an unverified result.

### Cart behavior

`CartPage` will only finalize successful verified results. Its error path will keep checkout data and cart contents available for retry and will explain that the order was not confirmed, instead of implying that an order exists.

### Release freshness

The PWA registration will request immediate service-worker updates and activate a waiting update. Workbox will clean outdated caches. This narrows stale-release exposure while preserving installability and offline static assets.

### Order-page startup

The Auth provider's immediate-route expression will include singular `/order`, allowing the public order lookup to start without the ten-second deferred-auth window.

## Error handling

The customer sees a concise retry message when persistence or verification fails. Technical details remain in console logging. WhatsApp is never opened for an unverified order. If WhatsApp itself fails to open after verification, the verified order remains available and the customer can retry from the pending-order UI.

## Testing

Regression tests will prove that:

- checkout verifies the created order before generating its link or opening WhatsApp;
- missing or mismatched verification rejects checkout;
- promo usage is not incremented before verification;
- the cart does not clear for an unverified checkout;
- `/order` triggers immediate Auth initialization;
- PWA configuration activates updates and cleans outdated caches; and
- the existing test suite, lint, and production build remain successful.

## Non-goals

- Migrating order creation to Cloud Functions.
- Changing the Firestore order schema.
- Recovering the already-missing order document.
- Refactoring unrelated cart, admin, or order-management behavior.
