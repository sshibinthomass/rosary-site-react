# Verified Order Checkout Design

## Problem

A customer received an order URL on May 15, 2026 whose Firestore document no longer existed on July 19, 2026. Reconstruction of the May release shows that checkout awaited `setDoc` and generated the link only after the write succeeded, so the document existed when the WhatsApp message was created. The Firebase project has no TTL policy and this repository has no automatic order cleanup, but the admin UI exposes permanent single and bulk deletion for cancelled and delivered orders. Historical data-access audit logs were not available to identify the deletion actor.

The current checkout also treats a timed-out or failed Firestore save as a recoverable WhatsApp-only handoff. That is a separate reliability risk. Order routes defer Firebase Auth initialization for up to ten seconds, leaving the page blank before the lookup completes.

## Required behavior

- WhatsApp must open with an order URL only after the exact new Firestore document is confirmed by a server read.
- A save timeout, rejected write, missing verification document, or verification mismatch must fail checkout visibly.
- Failed checkout must keep the cart and delivery form intact and must not show the success panel, increment promo usage, or open WhatsApp.
- A successful checkout may increment promo usage, open WhatsApp, show the persistent confirmation panel, and clear the cart.
- Orders must not be permanently deleted through the application; cancelled or completed records must be archived while their public links remain readable.
- Firestore client rules must deny order deletion, including for administrators using the storefront client.
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

### Durable order retention

The admin order service will replace `deleteDoc` with an archive update containing `archived: true`, `archivedAt`, and `updatedAt`. Existing single-delete and bulk-delete controls will be relabelled as archive actions. Archived orders will be hidden from the default operational list but remain available through their original `/order/:documentId` URLs.

Firestore rules will set `allow delete: if false` for `orders`. This prevents accidental permanent deletion through any deployed storefront/admin client. Emergency erasure, when legally or operationally necessary, remains a deliberate Firebase/Google Cloud console operation outside the normal site workflow.

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
- admin archive actions update rather than delete order documents;
- archived orders remain readable by their original document URL;
- Firestore rules deny client-side order deletion;
- `/order` triggers immediate Auth initialization;
- PWA configuration activates updates and cleans outdated caches; and
- the existing test suite, lint, and production build remain successful.

## Non-goals

- Migrating order creation to Cloud Functions.
- Changing the Firestore order schema.
- Automatically recovering the already-missing order document; it can only be reconstructed from the WhatsApp message or another backup.
- Refactoring unrelated cart, admin, or order-management behavior.
