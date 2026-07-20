# Checkout Attempt Tracking Final Fix Report

Status: **DONE_WITH_CONCERNS**

Baseline implementation commit: `392114a fix: secure checkout attempt tracking`

Prior re-review correction: `a8ced4b fix: harden durable checkout diagnostics`

Final important-findings correction: included in the single correction commit reported in the final handoff.

No Firebase, Vercel, or other production-state deployment was performed.

## Outcome

The final re-review findings are implemented. Customer diagnostic writes use the Vercel endpoint with a named secondary Firebase app, local anonymous-auth persistence, and a freshly refreshed anonymous writer ID token for every create, update, and outbox replay. The server verifies that token, requires the anonymous sign-in provider, and stores the immutable `writerUid`. An optional customer `userId` is sent only when a separate, freshly refreshed primary-user token still matches the same primary auth user before and after refresh.

No writer or primary ID token is stored in the outbox, local storage, request body, URL, log, confirmation state, or customer-visible text. A cold reload can restore the secondary anonymous writer and replay queued operations. If a create anchor replays under a changed or lost writer, the stable permanent response is `attempt-conflict`; a direct PATCH under the wrong writer receives `writer-mismatch`. Either response isolates and removes only the unchanged affected group.

The originating Cart click now synchronously reserves one web popup immediately after the `isSaving` guard and before any awaited work. The exact handle flows through `initiateWhatsAppCheckout` and `runVerifiedCheckout`; after verification, its `opener` is cleared and that handle is navigated without a second `window.open`. Native checkout reserves no browser window. Pre-handoff business failures and navigation failures close the exact handle on a best-effort basis. A blocked reservation still saves the order, reports stable `whatsapp-launch-failed`, and exposes a direct-click retry.

Every outbox replay operation is bounded to 750 ms across writer-token acquisition, optional primary identity acquisition, and API fetch. A timeout retains the group and processing continues with later groups; the timed-out promise already has rejection handlers, so a late failure cannot become unhandled. Flushes remove only the operation IDs in the sent snapshot. Operations appended while a request is in flight survive both successful and permanent responses. Admin `resolvedAt` is set only when entering `resolved`, preserved during notes-only saves while resolved, and deleted when reopening. Direct `deadline-exceeded` errors are classified as network failures.

## Re-review TDD evidence

Focused tests were made red before each correction and then driven green:

| Area | RED evidence | GREEN evidence |
| --- | --- | --- |
| Writer auth, transport, and API | 0 passed / 5 failed because the secondary writer module and server contract did not exist; the final primary-app isolation regression then failed 1 of 3 focused tests. | 13 passed / 0 failed after named-app isolation, explicit default-app selection, local anonymous persistence, forced token refresh, separate headers, immutable writer ownership, and optional primary identity. |
| Service and model | 34 passed / 6 failed for cached authorization, stale identity, and old model shape. | 40 passed / 0 failed for fresh per-operation writer tokens, primary-user rechecks, omission on refresh failure, and no token-bearing model state. |
| Durable outbox | 9 passed / 2 failed for token persistence and successful-flush deletion races; a strengthened permanent-response race then produced 11 passed / 1 failed. The final replay-deadline tests produced 12 passed / 2 failed because a hanging writer token or fetch blocked the whole flush. | 14 passed / 0 failed for cold reload replay, token-free storage, compare-and-remove behavior, group isolation, correct create/update conflict codes, and a complete per-operation deadline that retains timed-out groups while later groups proceed without late unhandled rejections. |
| Web popup contract | 2 passed / 5 failed for the old direct navigation behavior. The final originating-click contract produced 17 passed / 4 failed because reservation was late and the handle was not propagated. | 43 passed / 0 failed across popup, checkout, integration, and retry suites for synchronous originating-click reservation, exact-handle propagation, native behavior, opener clearing, navigation, cleanup, and stable failure codes. |
| Resolution and error semantics | 33 passed / 3 failed for the missing transition helper, stale rules behavior, and deadline classification. | 60 passed / 0 failed across model, service, admin, and rules-contract tests, including the executable emulator transition matrix. |
| Final correction focus and full integration | The combined final popup/outbox focus first exposed the issues above. | The combined final focus passed 57 / 57, followed by the fresh full suite at 305 passed / 0 failed. |

## Files

- Secondary writer identity and primary-app isolation: `src/services/checkoutDiagnosticWriterAuth.js`, `src/config/firebase.js`, `src/config/firebaseAuth.js`.
- Server endpoint and Firebase Admin: `api/checkout-attempts-core.js`, `api/checkout-attempts-firebase.js`, `api/checkout-attempts.js`, `api/firebase-admin.js`.
- Client tracking: `src/services/checkoutAttemptService.js`, `src/services/verifiedCheckout.js`, `src/services/whatsappCheckout.js`, `src/utils/checkoutAttemptModel.js`, `src/utils/checkoutAttemptOutbox.js`, `src/utils/checkoutAttemptTransport.js`, `src/utils/externalNavigation.js`.
- UI: `src/pages/AdminCheckoutTrackingPage.jsx`, `src/pages/CartPage.jsx`.
- Security/tooling: `firestore.rules`, `eslint.config.js`, `package.json`, `package-lock.json`, `.env.example`.
- Documentation: `README.md`, the checkout tracking design, and the implementation plan.
- Tests: API, writer auth, Firebase adapter, Firestore rules/matrix, transport, model, outbox, service, integration, admin, cart, external navigation, and verified checkout suites under `tests/`.

## Fresh final verification

All commands ran in `D:\Projects\Website\rosary-site-react\.worktrees\checkout-attempt-tracking` after the final implementation change.

| Command | Exit | Result |
| --- | ---: | --- |
| `npm test` | 0 | 305 passed, 0 failed. |
| `npm run build` | 0 | Vite 7.3.0 built 695 modules; PWA output, 313 plant pages, 16 category pages, and 14 guide pages generated. |
| Focused ESLint over the final correction-wave production and test files | 0 | 0 errors and 1 warning at `src/pages/CartPage.jsx:187`; linting the committed `HEAD` version through stdin produced the identical warning, proving it pre-existed this correction. |
| `npm run lint` | 1 | 52 errors and 12 warnings, exactly matching the historical repository baseline; no finding is in the changed scope. |
| `npm run test:firestore-rules` | 1 | Could not start because the Firebase CLI is not installed. |
| `java -version` | 1 | Java is not installed, so the local Firestore emulator cannot run on this workstation. |
| `firebase --version` | 1 | The Firebase CLI is not installed. |

The production build reported the existing/non-blocking large-chunk warning, seven-month-old `caniuse-lite` data, and the skipped optional Firebase storefront merge because local `VITE_FIREBASE_*` values were absent. Build-generated tracked SEO artifacts were restored exactly from the index after verification and are not part of the correction commit.

The prior dependency installation reported 23 audit findings (1 low, 11 moderate, 9 high, 2 critical). No broad dependency upgrades or audit fixes were attempted because they are outside this correction wave.

## Emulator authorization matrix

`tests/firestoreRules.emulator.mjs` covers:

- unauthenticated checkout-attempt create, update, get, list, and delete denial;
- admin get, list, and exact investigation update allowance;
- `resolvedAt` creation only on entry to resolved, preservation on resolved notes saves, and deletion on reopen;
- admin checkout-attempt delete denial;
- protected order delete denial; and
- unrelated authenticated-admin fallback access.

The matrix and source-contract tests are committed, but runtime proof requires installing Java plus the Firebase CLI and rerunning `npm run test:firestore-rules` locally or in CI.

## Self-review

- Request method, JSON content type, 32 KiB body limit, exact allowlists, identifier formats, string lengths, numeric ranges, expiry, event/error schema, immutable fields, and stable error classes are enforced.
- Every customer write verifies a fresh anonymous writer token. POST is idempotent only for the same `writerUid`; PATCH requires the immutable stored writer UID and uses a Firestore Admin transaction.
- Optional diagnostic `userId` requires a separate fresh primary-user token for the same UID; anonymous or mismatched primary identity is rejected, while unavailable client identity is omitted without affecting checkout.
- Diagnostic payloads and legacy admin reads strip email, delivery/street address, pincode, district, state, internal writer ownership, and unapproved top-level/event error fields.
- Public checkout-attempt CRUD is denied; admin deletes remain denied; the recursive fallback excludes both `orders` and `checkoutAttempts`.
- Best-effort diagnostic failures do not change order saving, verification, or customer checkout results.
- Outbox expiry, malformed/orphan pruning, permanent failures, and retryable failures operate per whole attempt group. Every authenticated replay operation is deadline-bounded across token work and fetch; timeouts retain their group, later groups continue, and late rejections are observed. Successful flushes compare-and-remove the sent operations, and permanent responses remove a group only if its operation snapshot is unchanged.
- Web popup handling reserves exactly one handle in the originating click before checkout awaits, propagates that exact handle, severs `window.opener` before navigation, and closes it on business or navigation failure. Native launch rejection and `{completed:false}` are stable WhatsApp failures without a browser reservation.
- Retry success/failure closes the original authorized tracker and never creates another order.
- Admin saves are isolated per record, preserve unsaved notes after failure, and maintain `resolvedAt` according to state transitions rather than every save.

## Deployment prerequisites and smoke checks

1. Enable the Firebase Authentication Anonymous provider for the project before releasing the client or API changes.
2. Configure exactly one server-only Firebase Admin credential: `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_BASE64`. Do not place it in a `VITE_*` variable.
3. Install dependencies and run the complete test/build/lint checks in CI.
4. Install Java and the Firebase CLI, then run `npm run test:firestore-rules` against the local emulator.
5. Deploy `firestore.rules` before or together with the application release; deploy any required Firestore indexes.
6. Enable a TTL policy for `checkoutAttempts.expiresAt`.
7. Deploy the Vercel API and web application with the server credential available only to the API runtime.
8. Smoke test a fresh anonymous checkout, a cold-reload create replay under a changed writer (`attempt-conflict`), a direct wrong-writer PATCH (`writer-mismatch`), a signed-in checkout, a blocked web popup, a web navigation failure, a native launch failure, a verification failure, offline/retry behavior, and a saved-order WhatsApp retry.
9. For each smoke test, confirm support-code lookup in Admin Checkout Tracking, expected timeline/stage/order link, notes/status actions, stable `resolvedAt`, normal hiding of resolved records, and explicit-query retrieval of resolved records.

## Concerns

- The Firestore emulator matrix could not execute in this workstation environment because Java and the Firebase CLI are missing.
- Repository-wide lint remains nonzero at its unchanged historical baseline; scoped correction-wave lint has no errors or new warnings, with one independently confirmed pre-existing hook warning.
- Build warnings, npm audit findings, and repository-wide lint debt remain outside this correction wave.
- Production Auth configuration, deployment, TTL/index configuration, and live smoke tests were intentionally not performed.
