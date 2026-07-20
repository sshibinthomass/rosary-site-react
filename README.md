# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Android Firebase config

`android/app/google-services.json` is intentionally local-only and ignored by Git. For Android builds that need native Google sign-in, download a fresh `google-services.json` for the `com.rosaryplants.app` Android app from Firebase Console, or copy `android/app/google-services.example.json` to `android/app/google-services.json` and replace the placeholder values.

If GitHub reports a leaked Google API key, rotate or restrict the exposed key in Google Cloud/Firebase before dismissing the alert. Removing the file from future commits does not invalidate a key that was already exposed.

## Checkout diagnostic deployment

Customer checkout diagnostics use the Vercel `/api/checkout-attempts` endpoint and Firebase Admin; browsers do not write the `checkoutAttempts` collection directly. Before deploying, enable **Anonymous** as a Firebase Authentication sign-in provider for the same Firebase project used by the existing public `VITE_FIREBASE_*` configuration.

The browser initializes a named secondary Firebase app only for diagnostic writers, uses `browserLocalPersistence`, and signs in anonymously. This does not change the default Firebase app or the customer/admin login in `AuthContext`. Every diagnostic request refreshes the secondary writer ID token and sends it as `Authorization: Bearer <token>`. A create request may separately send a freshly refreshed primary-user token in `X-Checkout-User-Token` when the current primary user still matches the optional diagnostic `userId`.

Configure exactly one of these server-only Vercel environment variables:

- `FIREBASE_SERVICE_ACCOUNT_BASE64` (recommended for a single-line Vercel value)
- `FIREBASE_SERVICE_ACCOUNT_JSON`

Never prefix either variable with `VITE_`, expose its value to the browser, or commit a real service account. Firebase Admin verifies the anonymous token and stores its immutable `writerUid`; only that writer may advance the attempt. ID tokens are never stored in Firestore, the local outbox, URLs, logs, confirmation state, or customer-visible text. Diagnostic payloads contain name, phone, WhatsApp, safe cart fields, and an optional independently verified primary user ID; they exclude email and delivery-location fields.

Deploy in this order:

1. Enable Firebase Anonymous Authentication for the project; do not change the existing primary Google sign-in configuration.
2. Add the server-only credential variable to the Vercel environment that will host the release.
3. Publish `firestore.rules` so public checkout-attempt create/update/read/list/delete are denied.
4. Publish `firestore.indexes.json`, then confirm Firestore TTL is enabled for `checkoutAttempts.expiresAt`.
5. Deploy the Vercel release containing both `/api/checkout-attempts` and the web build.

After deployment, run these live smoke checks without using production credentials locally:

1. Complete a normal test checkout. Confirm its support code and canonical order ID find the same attempt under Admin -> Checkout Tracking.
2. Block the WhatsApp popup/launcher. Confirm the saved-order panel appears, then use `Open WhatsApp again`; the same attempt should recover without a duplicate order.
3. Queue a diagnostic while offline, fully reload the app, reconnect, and confirm the same anonymously authenticated writer can flush it. Confirm a changed/lost writer receives a permanent mismatch for only that attempt group while later groups continue.
4. Confirm Firestore stores `writerUid` but no ID token, email, street address, pincode, district, or state.
5. Save notes on an already resolved attempt and confirm its original `resolvedAt` is unchanged. Reopening clears `resolvedAt`; resolving again sets a new server timestamp. The record should hide by default but remain findable by its explicit support-code/order-ID URL.
6. Confirm an unauthenticated browser cannot create, update, get, list, or delete `checkoutAttempts`, and that an admin still cannot delete a checkout attempt or protected order.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
