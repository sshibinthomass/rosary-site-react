# Checkout Attempt Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record every observable checkout attempt with a support code and stage timeline, then give administrators a searchable workflow for diagnosing and resolving customer complaints.

**Architecture:** A pure model creates stable diagnostic records and sanitized events. Customer writes go through the Vercel `/api/checkout-attempts` endpoint, whose Firebase Admin transaction validates a high-entropy capability token and stores only its SHA-256 hash. A bounded, expiring local-storage outbox keeps whole attempt groups while the raw token stays in an opaque in-memory session. Firestore browser access is admin-only. The verified checkout orchestrator reports stages through a failure-isolated tracker, and a protected admin page lists, filters, expands, and resolves the records.

**Tech Stack:** React 19, React Router 7, Firebase/Firestore 12, Vite 7, Tailwind CSS 4, Node.js built-in test runner, ESLint.

## Global Constraints

- Track successful and failed checkout attempts, including failures before an order document exists.
- Show customer name, attempted order cost, cart contents, current stage, result, and time.
- Search by support code, order ID, customer name, and phone/WhatsApp number.
- Resolution states are exactly `open`, `investigating`, and `resolved`.
- Retention is exactly 180 days through `checkoutAttempts.expiresAt` and a deployed Firestore TTL policy.
- `whatsapp_opened` means only that the site handed the URL to WhatsApp; never call it sent, confirmed, or paid.
- Diagnostic persistence is best-effort and must never block or change a valid checkout result.
- Diagnostic PII is limited to name, phone, WhatsApp, safe cart fields, and an optional server-verified user ID; never persist email or delivery-location fields.
- Public clients cannot create, update, read, list, or delete checkout-attempt records directly.
- Never persist or return the raw capability token; Firestore stores only its SHA-256 hash.
- Never persist stack traces, credentials, Firebase configuration, or arbitrary serialized error objects.
- Preserve the existing order archive behavior and cart preservation on checkout failure.

---

## File Structure

- Create `src/utils/checkoutAttemptModel.js`: pure IDs, snapshots, event creation, error sanitization, and admin filtering.
- Create `src/utils/checkoutAttemptOutbox.js`: bounded/expiring local-storage attempt groups with operation deduplication.
- Create `src/utils/checkoutAttemptTransport.js`: exact POST/PATCH requests to `/api/checkout-attempts` and stable response classification.
- Create `src/services/checkoutAttemptService.js`: API-backed customer tracking, admin-only Firestore queries/updates, opaque authorization sessions, and grouped outbox flushing.
- Create `api/checkout-attempts-core.js`, `api/checkout-attempts-firebase.js`, `api/firebase-admin.js`, and `api/checkout-attempts.js`: validation, transactional Firebase Admin persistence, credential initialization, and the Vercel entry point.
- Modify `src/services/verifiedCheckout.js`: emit the verified checkout stages without importing Firebase.
- Modify `src/services/whatsappCheckout.js`: create a tracker session and return its support code.
- Modify `src/pages/CartPage.jsx`: show the support code on failure and saved-order WhatsApp retry states.
- Create `src/pages/AdminCheckoutTrackingPage.jsx`: admin list, filters, details, timeline, notes, and resolution actions.
- Modify `src/App.jsx`, `src/pages/AdminHome.jsx`, and `src/pages/AdminOrdersPage.jsx`: protected route and navigation links.
- Modify `src/components/AppLifecycle.jsx`: retry queued diagnostic operations on app open, focus, and online events.
- Modify `firestore.rules`: deny all public checkout-attempt access and constrain admin investigation updates.
- Create focused tests under `tests/` for each boundary.

---

### Task 1: Pure Diagnostic Model and Durable Outbox

**Files:**
- Create: `src/utils/checkoutAttemptModel.js`
- Create: `src/utils/checkoutAttemptOutbox.js`
- Create: `tests/checkoutAttemptModel.test.mjs`
- Create: `tests/checkoutAttemptOutbox.test.mjs`

**Interfaces:**
- Produces: `createCheckoutAttempt(input, generators) -> CheckoutAttempt`.
- Produces: `createCheckoutEvent(stage, details, now) -> CheckoutEvent`.
- Produces: `sanitizeCheckoutError(error) -> { category, code, message }`.
- Produces: `filterCheckoutAttempts(attempts, filters) -> CheckoutAttempt[]`.
- Produces: `enqueueCheckoutAttemptGroup(storage, group)`, `readCheckoutOutbox(storage)`, `pruneCheckoutOutbox(storage)`, and `removeCheckoutAttemptGroup(storage, attemptId)`.

- [ ] **Step 1: Write failing model tests**

Create deterministic tests that pass fixed `randomUUID`, `randomBytes`, and `now` generators. Assert the output includes `supportCode: 'CHK-7K2M9Q'`, a separate in-memory capability token, normalized digits-only contact fields, item snapshots, `currentStage: 'started'`, `result: 'in_progress'`, `resolutionStatus: 'open'`, and `expiresAt` exactly 180 days after `createdAt`. Assert email and delivery-location fields are absent.

```js
test('creates a complete 180-day checkout attempt snapshot', () => {
  const attempt = createCheckoutAttempt(input, fixedGenerators);
  assert.equal(attempt.supportCode, 'CHK-7K2M9Q');
  assert.equal(attempt.customer.name, 'Anu');
  assert.equal(attempt.customer.phone, '919876543210');
  assert.equal(attempt.totalAmount, 137);
  assert.deepEqual(attempt.items[0], {
    productId: '49', name: 'Hydrangea', price: 39, quantity: 1,
  });
  assert.equal(attempt.currentStage, 'started');
  assert.equal(attempt.result, 'in_progress');
  assert.equal(attempt.resolutionStatus, 'open');
  assert.equal(attempt.expiresAt, '2027-01-15T12:00:00.000Z');
});
```

Add table-driven sanitization tests for Firebase permission, network, verification, WhatsApp launch, validation, and unknown errors. Assert messages are capped at 240 characters and do not contain `stack`, `apiKey`, or a serialized object. Add filter tests covering query matches for support code, order ID, name, phone, result, stage, resolution status, date range, and the default exclusion of resolved records.

- [ ] **Step 2: Run model tests and verify RED**

Run: `node --test tests/checkoutAttemptModel.test.mjs`

Expected: FAIL because `src/utils/checkoutAttemptModel.js` does not exist.

- [ ] **Step 3: Implement the pure diagnostic model**

Export these constants and functions:

```js
export const CHECKOUT_STAGES = Object.freeze([
  'started', 'details_validated', 'order_saved',
  'order_verified', 'whatsapp_opened', 'completed',
]);
export const CHECKOUT_RESULTS = Object.freeze(['in_progress', 'successful', 'failed']);
export const RESOLUTION_STATUSES = Object.freeze(['open', 'investigating', 'resolved']);
export const CHECKOUT_RETENTION_DAYS = 180;

export function normalizeContact(value = '') {
  return String(value).replace(/\D/g, '');
}

export function createCheckoutEvent(stage, details = {}, now = () => new Date()) {
  return {
    eventId: details.eventId,
    stage,
    outcome: details.outcome || 'success',
    occurredAt: now().toISOString(),
    ...(details.error ? { error: details.error } : {}),
  };
}
```

Implement `createCheckoutAttempt` with primitive fields and plain ISO dates so it is unit-testable and safe to encode for the API. Copy only product ID, name, numeric price, and numeric quantity. Generate a random document ID with `randomUUID()`, a separate 32-byte capability token that never enters the persisted payload, and a six-character support suffix using an alphabet without ambiguous `0/O/1/I` characters.

Implement `sanitizeCheckoutError` by inspecting only `error.code` and `error.message`; map stable categories and return a generic safe fallback. Implement `filterCheckoutAttempts` as a pure client-side filter and descending created-time sort.

- [ ] **Step 4: Run model tests and verify GREEN**

Run: `node --test tests/checkoutAttemptModel.test.mjs`

Expected: all model tests PASS.

- [ ] **Step 5: Write failing outbox tests**

Use an in-memory storage fake. Prove that the queue deduplicates by `operationId`, preserves FIFO within an attempt, caps itself at 20 whole groups by dropping the oldest group, and never splits a create anchor from its updates. Cover malformed groups, missing-create orphans, expiry pruning, forbidden PII/token keys, permanent group failure, retryable retention, and later-group progress.

```js
enqueueCheckoutAttemptGroup(storage, attemptGroup);
enqueueCheckoutAttemptGroup(storage, attemptGroup);
assert.equal(readCheckoutOutbox(storage).length, 1);
removeCheckoutAttemptGroup(storage, attemptGroup.attemptId);
assert.deepEqual(readCheckoutOutbox(storage), []);
```

- [ ] **Step 6: Run outbox tests and verify RED**

Run: `node --test tests/checkoutAttemptOutbox.test.mjs`

Expected: FAIL because `src/utils/checkoutAttemptOutbox.js` does not exist.

- [ ] **Step 7: Implement the bounded outbox**

Use the key `rosary.checkoutAttemptOutbox.v2` and limit `20` attempt groups. Every group has one create anchor, a shared `attemptId`/`expiresAt`, unique FIFO operation IDs, and no raw authorization or forbidden PII. All functions accept an explicit Storage-compatible object and isolate storage errors.

- [ ] **Step 8: Run focused tests and commit**

Run: `node --test tests/checkoutAttemptModel.test.mjs tests/checkoutAttemptOutbox.test.mjs`

Expected: all tests PASS.

```powershell
git add src/utils/checkoutAttemptModel.js src/utils/checkoutAttemptOutbox.js tests/checkoutAttemptModel.test.mjs tests/checkoutAttemptOutbox.test.mjs
git commit -m "feat: add checkout diagnostic model"
```

### Task 2: Secure API Tracking Service and Firestore Rules

**Files:**
- Create: `api/checkout-attempts-core.js`, `api/checkout-attempts-firebase.js`, `api/firebase-admin.js`, `api/checkout-attempts.js`
- Create: `src/utils/checkoutAttemptTransport.js`
- Create: `src/services/checkoutAttemptService.js`
- Modify: `firestore.rules`, `firebase.json`, `firestore.indexes.json`
- Create: focused API, service, rules, transport, Firebase adapter, and emulator-matrix tests

**Interfaces:**
- `POST /api/checkout-attempts` creates an exact minimal-PII record; replay with the same attempt/token is idempotent and never overwrites advanced state.
- `PATCH /api/checkout-attempts` hashes and compares the capability token inside one Firebase Admin transaction, then permits only the next lifecycle stage or a matching same-stage failure event.
- `createCheckoutTracker(input)` returns a failure-isolated tracker with `{ attemptId, supportCode, stage, fail, linkOrder, complete, recordWhatsAppRetry }`; its raw capability stays in module-private memory.
- Admin `getAllCheckoutAttempts()` and `updateCheckoutAttemptResolution(...)` continue through authenticated Firestore client access.

- [ ] **Step 1: Test the API and transport contracts RED**

Cover exact methods/content type/body size and field allowlists, identifiers, numeric/string bounds, exact 180-day expiry, token format/hash matching, idempotent create, append-only matching events, forward transitions, immutable order links, optional Firebase ID-token UID matching, minimal PII, and permanent/retryable HTTP classification.

- [ ] **Step 2: Implement injectable Vercel and Firebase Admin modules**

Use only `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_BASE64` on the server. Store `capabilityTokenHash`, never the raw token. Return stable error objects with `code`, safe `message`, and `retryable`. The browser sends POST/PATCH requests only to `/api/checkout-attempts`; optional `userId` is included only with a matching Firebase ID token.

- [ ] **Step 3: Implement failure-isolated tracking and grouped flush**

Bound each diagnostic call. Queue a whole create-anchored attempt group after retryable/time-out failures, preserve FIFO/idempotency, continue to later groups after one group fails, retain only retryable groups, and drop only the permanently failed or unauthorizable group. Never let diagnostic I/O change checkout business behavior.

- [ ] **Step 4: Lock down Firestore and add the authorization matrix**

```text
match /checkoutAttempts/{attemptId} {
  allow get, list: if isAdmin();
  allow create: if false;
  allow update: if isAdmin() && isValidCheckoutAttemptAdminUpdate();
  allow delete: if false;
}
```

The admin helper allows only bounded `resolutionStatus`, `adminNotes`, `resolvedAt`, and server `updatedAt`. The recursive admin fallback excludes `orders` and `checkoutAttempts`. The emulator matrix covers public create/update/get/list/delete denial, admin get/list/resolution update, forbidden lifecycle update/delete, protected order delete, and unrelated admin fallback access.

- [ ] **Step 5: Run focused tests**

Run the API, Firebase adapter, transport, service, rules, grouped outbox, and emulator source-contract suites. Run the executable emulator matrix when Java and Firebase CLI are available; otherwise retain it and report the exact environment blocker.

### Task 3: Instrument Verified Checkout and Show Support Codes

**Files:**
- Modify: `src/services/verifiedCheckout.js`
- Modify: `src/services/whatsappCheckout.js`
- Modify: `src/pages/CartPage.jsx`
- Modify: `tests/verifiedCheckout.test.mjs`
- Modify: `tests/cartCheckoutFlow.test.mjs`
- Create: `tests/checkoutTrackingIntegration.test.mjs`

**Interfaces:**
- Consumes: `createCheckoutTracker(input)` from Task 2.
- Produces: `runVerifiedCheckout(input, dependencies)` with optional `dependencies.tracker`.
- Produces: checkout results containing `attemptId` and `supportCode` whenever tracker creation succeeds locally; a failed WhatsApp handoff also carries a non-enumerable retry callback that closes over the same authorized tracker session.

- [ ] **Step 1: Write failing orchestration tests**

Extend the existing callback event assertions to prove this sequence:

```js
assert.deepEqual(events, [
  'track:details_validated', 'create', 'track:order_saved',
  'verify', 'track:order_verified', 'promo', 'open',
  'track:whatsapp_opened', 'track:completed',
]);
```

For create and verification failures, assert `tracker.fail(error)` runs once and the original error is rethrown. Assign `verification-failed` at the verification boundary. For browser popup blocking or native launcher rejection, assign `whatsapp-launch-failed`, keep the saved-order result successful from the order perspective, set `whatsappOpened` false, and return the support code for complaint lookup. Add a test where every tracker method throws and prove the existing checkout result and callback order are unchanged.

- [ ] **Step 2: Run orchestration tests and verify RED**

Run: `node --test tests/verifiedCheckout.test.mjs tests/checkoutTrackingIntegration.test.mjs`

Expected: FAIL because verified checkout does not report tracking stages.

- [ ] **Step 3: Add failure-isolated stage reporting**

Create a local helper inside `runVerifiedCheckout`:

```js
const track = async (method, ...args) => {
  try {
    await dependencies.tracker?.[method]?.(...args);
  } catch (trackingError) {
    console.warn('Checkout tracking warning:', trackingError);
  }
};
```

Wrap the business flow in `try/catch`, emit the exact stages in order, call `fail` before rethrowing business failures, and do not allow tracking callbacks to enter the business error path. Treat WhatsApp open failure as a tracker failure while keeping the existing saved-order retry result. Add `attemptId` and `supportCode` to both result variants. Define a non-enumerable `recordWhatsAppRetry` closure so it cannot be serialized into persisted confirmation data.

- [ ] **Step 4: Create the tracker in the production adapter**

In `initiateWhatsAppCheckout`, call `createCheckoutTracker` with only safe item, amount, name, phone, WhatsApp, and optional user-ID inputs. Pass the returned tracker into `runVerifiedCheckout`; order persistence remains unchanged, while diagnostics use only the secure API. If the business flow rejects, attach `tracker.attemptId` and `tracker.supportCode` as explicit properties on that same error before rethrowing it so CartPage can display the complaint reference without replacing the original cause.

- [ ] **Step 5: Write failing CartPage support-code tests**

Assert the failure catch stores a `checkoutIssue` object containing the support code, the visible message says `Support code:`, and a new attempt clears the previous issue. Assert successful confirmation details also retain the support code without claiming the WhatsApp message was sent.

- [ ] **Step 6: Run cart tests and verify RED**

Run: `node --test tests/cartCheckoutFlow.test.mjs`

Expected: FAIL because CartPage does not render diagnostic support codes.

- [ ] **Step 7: Implement customer-facing support-code handling**

Use state shaped as `{ supportCode, message }`. On an ordinary thrown error, obtain `err.supportCode` attached by the checkout adapter. Display:

```text
Order was not confirmed. Your cart is safe—please try again.
Support code: CHK-XXXXXX
```

Render the second line only when a code exists. For a saved order whose WhatsApp launch failed, include the support code in the persistent saved-order panel. When `Open WhatsApp again` succeeds or fails, invoke the opaque retry callback with the truthful result so the same attempt advances or receives another failure event. Isolate callback failures, preserve all current cart clearing rules, and never create another order during retry.

- [ ] **Step 8: Run focused tests and commit**

Run: `node --test tests/verifiedCheckout.test.mjs tests/checkoutTrackingIntegration.test.mjs tests/cartCheckoutFlow.test.mjs tests/orderWhatsapp.test.mjs`

Expected: all tests PASS.

```powershell
git add src/services/verifiedCheckout.js src/services/whatsappCheckout.js src/pages/CartPage.jsx tests/verifiedCheckout.test.mjs tests/checkoutTrackingIntegration.test.mjs tests/cartCheckoutFlow.test.mjs
git commit -m "feat: track verified checkout stages"
```

### Task 4: Retry Queued Diagnostics Across App Lifecycle

**Files:**
- Modify: `src/components/AppLifecycle.jsx`
- Create: `tests/checkoutAttemptRetry.test.mjs`

**Interfaces:**
- Consumes: `flushCheckoutAttemptOutbox(window.localStorage)` from Task 2.
- Produces: best-effort retry on app open, browser `online`, focus, visible state, and native resume.

- [ ] **Step 1: Write the failing lifecycle test**

Use source-contract assertions to require the flush import, one guarded `flushCheckoutDiagnostics` helper, and `online` event registration/cleanup. Assert every call uses `.catch(...)` or an awaited guarded block so retry rejection cannot break catalog refresh or app lifecycle listeners.

- [ ] **Step 2: Run retry test and verify RED**

Run: `node --test tests/checkoutAttemptRetry.test.mjs`

Expected: FAIL because AppLifecycle does not flush the diagnostic outbox.

- [ ] **Step 3: Add failure-isolated retry triggers**

Add:

```js
const flushCheckoutDiagnostics = () => {
  void flushCheckoutAttemptOutbox(window.localStorage).catch((error) => {
    console.warn('Checkout diagnostic retry warning:', error);
  });
};
```

Call it on mount and alongside existing refresh behavior for focus, visible state, and native resume. Register and clean up `window.addEventListener('online', flushCheckoutDiagnostics)`. Do not create timers or retry loops.

- [ ] **Step 4: Run focused tests and commit**

Run: `node --test tests/checkoutAttemptRetry.test.mjs tests/catalogRefresh.test.mjs`

Expected: all tests PASS.

```powershell
git add src/components/AppLifecycle.jsx tests/checkoutAttemptRetry.test.mjs
git commit -m "feat: retry queued checkout diagnostics"
```

### Task 5: Admin Checkout Tracking Page and Navigation

**Files:**
- Create: `src/pages/AdminCheckoutTrackingPage.jsx`
- Modify: `src/App.jsx`
- Modify: `src/pages/AdminHome.jsx`
- Modify: `src/pages/AdminOrdersPage.jsx`
- Modify: `tests/adminHomeIcons.test.mjs`
- Create: `tests/adminCheckoutTrackingPage.test.mjs`

**Interfaces:**
- Consumes: `getAllCheckoutAttempts`, `updateCheckoutAttemptResolution`, `filterCheckoutAttempts`, `CHECKOUT_STAGES`, and `RESOLUTION_STATUSES`.
- Produces: protected `/admin/checkout-attempts` and `/admin/checkout-attempts.html` routes.
- Produces: order link `/admin/checkout-attempts?orderId=<business-order-id>`.

- [ ] **Step 1: Write failing admin page and route tests**

Assert the page imports the tracking service/model, loads attempts, derives summary counts, reads initial `orderId` and `supportCode` search parameters, and renders these exact labels:

```text
Checkout Tracking
Failures
Open investigations
Resolved
Successful
Customer
Order cost
Support code
Last stage
Attempt time
Cart snapshot
Timeline
Internal notes
Mark open
Mark investigating
Mark resolved
Save notes
```

Assert `App.jsx` lazy-loads the page and wraps both routes in `<ProtectedRoute requireAdmin>`. Update the expected Admin icon IDs to include `checkout-tracking`, and require the Admin home card description to mention customer checkout issues. Assert Admin Orders builds an encoded tracking link from `order.orderId`.

- [ ] **Step 2: Run admin tests and verify RED**

Run: `node --test tests/adminCheckoutTrackingPage.test.mjs tests/adminHomeIcons.test.mjs`

Expected: FAIL because the page and navigation do not exist.

- [ ] **Step 3: Implement the responsive admin page**

Follow existing admin page styles and use inline SVG through the existing `AdminIcon` pattern. Load records once, then use `filterCheckoutAttempts` for client-side search/filtering. Provide controls for free-text search, result, last stage, resolution status, start date, and end date. Default resolution filtering hides resolved entries, while an explicit support-code/order-ID URL query includes its resolved match.

Desktop uses a compact table; narrow screens use cards. Resolve `linkedOrderId`, legacy `orderId`, and `linkedOrderDocumentId` through one canonical accessor for search/display/linking. Each row/card shows customer name, primary contact, formatted INR cost, support code, linked order ID, last stage, result, resolution status, and local attempt time. Expanding it shows items with quantity and price, chronological timeline, sanitized error details, a linked `/order/:documentId` action when available, notes textarea, all three resolution buttons, and standalone `Save notes` that preserves the current status.

Keep unsaved notes in component state if a save fails. Disable only the active record while saving and show existing ToastContext success/error messages.

- [ ] **Step 4: Add protected routes and navigation**

Add an inline diagnostic-path icon, the `Checkout Tracking` Admin home card, the two protected lazy routes, and a `Checkout issues` link on each Admin Orders record:

```jsx
<NavLink to={`/admin/checkout-attempts?orderId=${encodeURIComponent(order.orderId || order.id)}`}>
  Checkout issues
</NavLink>
```

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test tests/adminCheckoutTrackingPage.test.mjs tests/adminHomeIcons.test.mjs tests/orderArchive.test.mjs`

Expected: all tests PASS.

```powershell
git add src/pages/AdminCheckoutTrackingPage.jsx src/App.jsx src/pages/AdminHome.jsx src/pages/AdminOrdersPage.jsx tests/adminCheckoutTrackingPage.test.mjs tests/adminHomeIcons.test.mjs
git commit -m "feat: add admin checkout tracking"
```

### Task 6: Verification and Deployment Handoff

**Files:**
- Verify all modified files.
- Modify: `README.md`

**Interfaces:**
- Produces: documented Firestore rules/index/TTL deployment steps and a fully verified production build.

- [ ] **Step 1: Document deployment requirements**

Add a `Checkout diagnostic deployment` section that states:

```text
1. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64 as a server-only Vercel variable; never use a VITE_ prefix.
2. Deploy firestore.rules so direct browser checkout-attempt access is denied.
3. Deploy firestore.indexes.json and confirm the checkoutAttempts.expiresAt TTL override is enabled.
4. Deploy the Vercel release containing both /api/checkout-attempts and the web build.
5. Run success, blocked-popup/retry, admin workflow, authorization, and minimal-PII live smoke checks.
```

Do not include service-account values or environment secrets.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test`

Expected: exit 0 with zero failed tests.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: exit 0 with zero errors.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: exit 0 with generated Vite/PWA production assets.

- [ ] **Step 5: Inspect final scope**

Run: `git status --short; git diff HEAD~5..HEAD --stat; git log -6 --oneline`

Expected: only approved tracking code, tests, rules, README, design, and plan are tracked; pre-existing untracked browser/output artifacts remain untouched.

- [ ] **Step 6: Commit the deployment documentation**

```powershell
git add README.md
git commit -m "docs: document checkout tracking deployment"
```

- [ ] **Step 7: Perform a manual smoke test after Firebase deployment**

Place successful and deliberately blocked-WhatsApp test checkouts. Confirm the customer sees a support code; `Admin -> Checkout Tracking` finds it by support code and order ID; only approved diagnostic PII is stored; the last stage matches the outcome; retry recovery updates the same attempt without a second order; notes persist independently; all three resolution states work; and resolved records hide by default but remain explicitly searchable. Confirm direct unauthenticated Firestore checkout-attempt access and admin deletes fail.
