# Browser Regression Hardening Design

## Scope

Address the three genuine failures found during the deep in-app-browser pass. Empty delivery details are intentionally supported and are not a defect.

## Checkout details and pincode behavior

Customer delivery fields remain optional and the order-request button remains available when they are blank. When the pincode changes, the previous district and state are cleared immediately. A successful six-digit lookup fills them again; an invalid or failed lookup leaves both fields empty so the form never displays a location belonging to an earlier pincode.

## Verified order and WhatsApp recovery

Firestore verification remains the commit boundary. After the exact document ID and business order ID are verified, the checkout is considered saved even if the device cannot launch WhatsApp. The checkout result will distinguish `savedToFirestore` from `whatsappOpened` and include the existing order and WhatsApp URL.

The cart page will clear the cart once the order is verified, show the saved order link, and display one of two confirmation states:

- WhatsApp opened: ask the customer to tap Send.
- WhatsApp failed to open: explain that the order is safely saved and provide an **Open WhatsApp again** button for the same order.

Retrying WhatsApp will not create another Firestore document or increment promo usage again. Promo usage is recorded once for the verified saved order.

## Release freshness

The app will request `ServiceWorkerRegistration.update()` when its service worker registers. Existing `onNeedRefresh` handling will activate the waiting release. This bypasses the browser's normal update-check throttling that left a recently installed test release stale across reloads and a new tab.

Offline support and cache cleanup remain enabled.

## Tests

Regression tests will cover:

- optional/blank delivery details remaining allowed;
- clearing stale district/state when the pincode changes, is invalid, or lookup fails;
- a verified order returning a recoverable result when WhatsApp fails;
- no second creation or promo increment during WhatsApp retry;
- explicit service-worker update checks at registration;
- the existing missing-document and mismatched-ID rejection cases.

After unit tests and the production build pass, the in-app browser pass will repeat the cart, pincode, WhatsApp-failure harness, offline cache, and two-release refresh scenarios.

## Out of scope

- Making delivery details mandatory.
- Reconstructing the already-deleted historical order.
- Replacing Firestore checkout with a server-side order API.
