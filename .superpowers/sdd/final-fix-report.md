# Checkout Attempt Tracking Final Fix Report

Status: **DONE_WITH_CONCERNS**

Implementation commit: `392114a fix: secure checkout attempt tracking`

No Firebase, Vercel, or other production-state deployment was performed.

## Outcome

The final review fix wave is implemented. Customer diagnostic writes now use a capability-authorized Vercel endpoint backed by Firebase Admin; public Firestore access to checkout attempts is denied; the local outbox stores bounded whole-attempt groups; diagnostic PII is reduced to the approved allowlist; linked-order handling and resolved searches are canonical; WhatsApp handoff/retry outcomes are truthful; and the admin investigation workflow supports open, investigating, resolved, and notes-only saves.

The raw per-attempt capability token is held only in module-private browser memory. Firestore stores only its SHA-256 hash, and the token is not stored in the outbox, URLs, logs, confirmation state, or customer-visible text.

## TDD evidence

Focused tests were added or changed before each implementation area. Representative RED to GREEN evidence:

| Area | RED evidence | GREEN evidence |
| --- | --- | --- |
| Server API and rules | New API/rules tests failed for missing modules and direct public-rule behavior. | API validation, authorization, idempotency, transitions, matching events, user-token verification, and rule source contracts pass. |
| Firebase adapter | Import failed because the adapter did not exist. | Transactional adapter and timestamp serialization tests pass, including `resolvedAt`. |
| Emulator matrix | Matrix/source-contract test failed while the emulator test file was absent. | The authorization matrix is present and its source contract passes; runtime execution is environment-blocked as recorded below. |
| Transport/model/outbox | Tests failed for missing API transport, raw-token persistence shape, and legacy individual-operation eviction. | API transport, minimal PII model, grouped capacity/expiry/pruning, FIFO, idempotency, and group-isolated failure tests pass. |
| Service/client writes | Tests detected direct customer Firestore writes and legacy behavior. | Customer writes use POST/PATCH API transport; admin reads/updates remain Firestore; optional verified user ID is best-effort. |
| Linked orders/admin search | Canonical accessor and resolved explicit-query integration tests failed. | Legacy/current linked IDs work for display, filter, search, and linking; explicit queries include resolved attempts. |
| WhatsApp truthfulness | Blocked popup, native rejection, and stable classification tests failed. | `window.open(null)`, rejected native launches, and native `{completed:false}` are failures; known failure codes are stable. |
| Admin/retry | Initial combined run was 40 passed / 6 failed. | Status buttons, notes-only save, per-record isolation, retained failed notes, and same-attempt retry recovery pass. |
| Self-review regressions | Focused additions caught missing `resolvedAt` conversion, legacy PII in admin reads, loose event timestamps/order-link timing, retry callback exposure after initial success, and native explicit-false handling. | All focused regressions pass after their narrow fixes. |

## Files

- Server endpoint and Firebase Admin: `api/checkout-attempts-core.js`, `api/checkout-attempts-firebase.js`, `api/checkout-attempts.js`, `api/firebase-admin.js`.
- Client tracking: `src/services/checkoutAttemptService.js`, `src/services/verifiedCheckout.js`, `src/services/whatsappCheckout.js`, `src/utils/checkoutAttemptModel.js`, `src/utils/checkoutAttemptOutbox.js`, `src/utils/checkoutAttemptTransport.js`, `src/utils/externalNavigation.js`.
- UI: `src/pages/AdminCheckoutTrackingPage.jsx`, `src/pages/CartPage.jsx`.
- Security/tooling: `firestore.rules`, `eslint.config.js`, `package.json`, `package-lock.json`, `.env.example`.
- Documentation: `README.md`, the checkout tracking design, and the implementation plan.
- Tests: API, Firebase adapter, Firestore rules/matrix, transport, model, outbox, service, integration, admin, cart, external navigation, and verified checkout suites under `tests/`.

## Fresh final verification

All commands ran in `D:\Projects\Website\rosary-site-react\.worktrees\checkout-attempt-tracking` after the final implementation change.

| Command | Exit | Result |
| --- | ---: | --- |
| `npm test` | 0 | 281 passed, 0 failed. |
| `npm run build` | 0 | Vite 7.3.0 built 694 modules; PWA output, 313 plant pages, 16 category pages, and 14 guide pages generated. |
| Focused ESLint over every modified/new API and tracking JS/MJS/JSX file | 0 | 0 errors; 1 warning in `CartPage.jsx` line 187. Running the `HEAD` version of that file through ESLint produces the same warning. |
| `npm run lint` | 1 | 52 errors and 12 warnings, exactly matching the historical repository baseline documented in `task-6-report.md`; no new scoped lint errors. |
| `git diff --check` | 0 | Clean before staging. |
| `git diff --cached --check` | 0 | Clean before the implementation commit. |
| `npm run test:firestore-rules` | 1 | Could not start because Java and the Firebase CLI are not installed; shell error: `'firebase' is not recognized as an internal or external command`. |

The production build reported the existing/non-blocking warnings for large chunks and seven-month-old `caniuse-lite` data. It also skipped the optional Firebase storefront merge because local `VITE_FIREBASE_*` values were absent. Build-generated tracked SEO artifacts were restored exactly to the index after verification and are not part of the commit.

`npm install --ignore-scripts` added the rules-unit-testing dependency and reported 23 audit findings (1 low, 11 moderate, 9 high, 2 critical). No broad dependency upgrades or audit fixes were attempted because they are outside this fix wave.

## Emulator authorization matrix

`tests/firestoreRules.emulator.mjs` covers:

- unauthenticated checkout-attempt create, update, get, list, and delete denial;
- admin get, list, and exact investigation update allowance;
- admin checkout-attempt delete denial;
- protected order delete denial; and
- unrelated authenticated-admin fallback access.

The matrix and source-contract tests are committed, but runtime proof requires installing Java plus the Firebase CLI and rerunning `npm run test:firestore-rules` locally or in CI.

## Self-review

- Request method, JSON content type, 32 KiB body limit, exact allowlists, identifier formats, string lengths, numeric ranges, expiry, event/error schema, immutable fields, and stable error classes are enforced.
- POST is idempotent only for the same attempt/token and cannot overwrite advanced state.
- PATCH hashes and timing-safely verifies the capability token inside the server flow, uses a Firestore Admin transaction, permits only forward lifecycle changes, and requires a same-stage/same-time appended event.
- Linked order identifiers can first appear only with `order_saved`; canonical reads cover `linkedOrderId`, `orderId`, and `linkedOrderDocumentId`.
- Optional diagnostic `userId` is accepted only when a Firebase ID token verifies to the same UID; unavailable identity verification is omitted without affecting checkout.
- Diagnostic payloads and legacy admin reads strip email, delivery/street address, pincode, district, state, and unapproved top-level/event error fields.
- Public checkout-attempt CRUD is denied; admin deletes remain denied; the recursive fallback excludes both `orders` and `checkoutAttempts`.
- Best-effort diagnostic failures do not change order saving, verification, or customer checkout results.
- Outbox eviction, expiry, malformed/orphan pruning, permanent failures, and retryable failures operate per whole attempt group and allow later groups to progress.
- Retry success/failure closes the original authorized tracker and never creates another order.
- Admin saves are isolated per record, preserve unsaved notes after failure, and support notes-only saves without forcing a status transition.

## Deployment prerequisites and smoke checks

1. Configure exactly one server-only Firebase Admin credential: `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_BASE64`. Do not place it in a `VITE_*` variable.
2. Install dependencies and run the complete test/build/lint checks in CI.
3. Install Java and the Firebase CLI, then run `npm run test:firestore-rules` against the local emulator.
4. Deploy `firestore.rules` before or together with the application release; deploy any required Firestore indexes.
5. Enable a TTL policy for `checkoutAttempts.expiresAt`.
6. Deploy the Vercel API and web application with the server credential available only to the API runtime.
7. Smoke test a successful checkout, a blocked WhatsApp popup, a native launch failure, a verification failure, offline/retry behavior, and a successful saved-order WhatsApp retry.
8. For each smoke test, confirm support-code lookup in Admin Checkout Tracking, expected timeline/stage/order link, notes/status actions, normal hiding of resolved records, and explicit-query retrieval of resolved records.

## Concerns

- The Firestore emulator matrix could not execute in this workstation environment because Java and the Firebase CLI are missing.
- Repository-wide lint remains nonzero at its unchanged historical baseline; scoped changed-file lint has no errors and one proven pre-existing warning.
- Build warnings and the npm audit findings above remain outside this fix wave.
- Production deployment, TTL/index configuration, and live smoke tests were intentionally not performed.
- Because raw capability tokens are memory-only, an outbox group surviving a full browser-process restart cannot be authorized and is pruned instead of weakening the token boundary. Same-process offline retries remain supported.
