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

Customer checkout diagnostics use the Vercel `/api/checkout-attempts` endpoint and Firebase Admin; browsers do not write the `checkoutAttempts` collection directly. Configure exactly one of these server-only Vercel environment variables:

- `FIREBASE_SERVICE_ACCOUNT_BASE64` (recommended for a single-line Vercel value)
- `FIREBASE_SERVICE_ACCOUNT_JSON`

Never prefix either variable with `VITE_`, expose its value to the browser, or commit a real service account. The API stores only a SHA-256 capability-token hash. Diagnostic payloads contain name, phone, WhatsApp, safe cart fields, and an optional Firebase-token-verified user ID; they exclude email and delivery-location fields.

Deploy in this order:

1. Add the server-only credential variable to the Vercel environment that will host the release.
2. Publish `firestore.rules` so public checkout-attempt create/update/read/list/delete are denied.
3. Publish `firestore.indexes.json`, then confirm Firestore TTL is enabled for `checkoutAttempts.expiresAt`.
4. Deploy the Vercel release containing both `/api/checkout-attempts` and the web build.

After deployment, run these live smoke checks without using production credentials locally:

1. Complete a normal test checkout. Confirm its support code and canonical order ID find the same attempt under Admin -> Checkout Tracking.
2. Block the WhatsApp popup/launcher. Confirm the saved-order panel appears, then use `Open WhatsApp again`; the same attempt should recover without a duplicate order.
3. Confirm Firestore stores `capabilityTokenHash` but no raw capability token, email, street address, pincode, district, or state.
4. Save notes while the attempt is `open`, then exercise `investigating`, `resolved`, and `open`; a resolved record should hide by default but remain findable by its explicit support-code/order-ID URL.
5. Confirm an unauthenticated browser cannot create, update, get, list, or delete `checkoutAttempts`, and that an admin still cannot delete a checkout attempt or protected order.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
