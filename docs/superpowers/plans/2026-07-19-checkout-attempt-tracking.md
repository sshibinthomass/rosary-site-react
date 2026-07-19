# Checkout Attempt Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record every observable checkout attempt with a support code and stage timeline, then give administrators a searchable workflow for diagnosing and resolving customer complaints.

**Architecture:** A pure model module creates stable diagnostic records and sanitized events, while a Firestore service persists them and a bounded local-storage outbox retries failed writes. The existing verified checkout orchestrator reports stages through a failure-isolated tracker. A protected admin page lists, filters, expands, and resolves the separate diagnostic records.

**Tech Stack:** React 19, React Router 7, Firebase/Firestore 12, Vite 7, Tailwind CSS 4, Node.js built-in test runner, ESLint.

## Global Constraints

- Track successful and failed checkout attempts, including failures before an order document exists.
- Show customer name, attempted order cost, cart contents, current stage, result, and time.
- Search by support code, order ID, customer name, and phone/WhatsApp number.
- Resolution states are exactly `open`, `investigating`, and `resolved`.
- Retention is exactly 180 days through `checkoutAttempts.expiresAt` and a deployed Firestore TTL policy.
- `whatsapp_opened` means only that the site handed the URL to WhatsApp; never call it sent, confirmed, or paid.
- Diagnostic persistence is best-effort and must never block or change a valid checkout result.
- Never persist stack traces, credentials, Firebase configuration, or arbitrary serialized error objects.
- Public clients cannot read, list, or delete checkout-attempt records.
- Preserve the existing order archive behavior and cart preservation on checkout failure.

---

## File Structure

- Create `src/utils/checkoutAttemptModel.js`: pure IDs, snapshots, event creation, error sanitization, and admin filtering.
- Create `src/utils/checkoutAttemptOutbox.js`: bounded local-storage queue with operation deduplication.
- Create `src/services/checkoutAttemptService.js`: Firestore writes, admin queries/updates, tracker session, and outbox flushing.
- Modify `src/services/verifiedCheckout.js`: emit the verified checkout stages without importing Firebase.
- Modify `src/services/whatsappCheckout.js`: create a tracker session and return its support code.
- Modify `src/pages/CartPage.jsx`: show the support code on failure and saved-order WhatsApp retry states.
- Create `src/pages/AdminCheckoutTrackingPage.jsx`: admin list, filters, details, timeline, notes, and resolution actions.
- Modify `src/App.jsx`, `src/pages/AdminHome.jsx`, and `src/pages/AdminOrdersPage.jsx`: protected route and navigation links.
- Modify `src/components/AppLifecycle.jsx`: retry queued diagnostic operations on app open, focus, and online events.
- Modify `firestore.rules`: isolate public diagnostic writes from admin reads and resolution changes.
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
- Produces: `enqueueCheckoutOperation(storage, operation)`, `readCheckoutOutbox(storage)`, `removeCheckoutOperation(storage, operationId)`.

- [ ] **Step 1: Write failing model tests**

Create deterministic tests that pass fixed `randomUUID`, `randomBytes`, and `now` generators. Assert the output includes `supportCode: 'CHK-7K2M9Q'`, a separate client token, normalized digits-only phone fields, item snapshots, `currentStage: 'started'`, `result: 'in_progress'`, `resolutionStatus: 'open'`, and `expiresAt` exactly 180 days after `createdAt`.

```js
test('creates a complete 180-day checkout attempt snapshot', () => {
  const attempt = createCheckoutAttempt(input, fixedGenerators);
  assert.equal(attempt.supportCode, 'CHK-7K2M9Q');
  assert.equal(attempt.customer.name, 'Anu');
  assert.equal(attempt.customer.phoneSearch, '919876543210');
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

Implement `createCheckoutAttempt` with primitive fields and plain ISO dates so it is unit-testable; the service converts date strings to Firestore `Timestamp` values. Copy only product ID, name, numeric price, and numeric quantity. Generate a random Firestore document ID with `randomUUID()`, a separate 32-byte token, and a six-character support suffix using an alphabet without ambiguous `0/O/1/I` characters.

Implement `sanitizeCheckoutError` by inspecting only `error.code` and `error.message`; map stable categories and return a generic safe fallback. Implement `filterCheckoutAttempts` as a pure client-side filter and descending created-time sort.

- [ ] **Step 4: Run model tests and verify GREEN**

Run: `node --test tests/checkoutAttemptModel.test.mjs`

Expected: all model tests PASS.

- [ ] **Step 5: Write failing outbox tests**

Use an in-memory storage fake. Prove that the queue deduplicates by `operationId`, preserves FIFO order, caps itself at 100 operations by dropping the oldest entry, tolerates invalid stored JSON by returning an empty list, and removes only a successfully flushed operation.

```js
enqueueCheckoutOperation(storage, { operationId: 'op-1', type: 'create', payload: {} });
enqueueCheckoutOperation(storage, { operationId: 'op-1', type: 'create', payload: {} });
assert.equal(readCheckoutOutbox(storage).length, 1);
removeCheckoutOperation(storage, 'op-1');
assert.deepEqual(readCheckoutOutbox(storage), []);
```

- [ ] **Step 6: Run outbox tests and verify RED**

Run: `node --test tests/checkoutAttemptOutbox.test.mjs`

Expected: FAIL because `src/utils/checkoutAttemptOutbox.js` does not exist.

- [ ] **Step 7: Implement the bounded outbox**

Use the key `rosary.checkoutAttemptOutbox.v1` and limit `100`. All functions must accept an explicit Storage-compatible object for testability and catch storage access errors. `enqueueCheckoutOperation` returns `true` only when persisted; `readCheckoutOutbox` always returns an array; `removeCheckoutOperation` returns whether the queue changed.

- [ ] **Step 8: Run focused tests and commit**

Run: `node --test tests/checkoutAttemptModel.test.mjs tests/checkoutAttemptOutbox.test.mjs`

Expected: all tests PASS.

```powershell
git add src/utils/checkoutAttemptModel.js src/utils/checkoutAttemptOutbox.js tests/checkoutAttemptModel.test.mjs tests/checkoutAttemptOutbox.test.mjs
git commit -m "feat: add checkout diagnostic model"
```

### Task 2: Firestore Tracking Service and Security Rules

**Files:**
- Create: `src/services/checkoutAttemptService.js`
- Modify: `firestore.rules`
- Create: `tests/checkoutAttemptService.test.mjs`
- Create: `tests/checkoutAttemptRules.test.mjs`

**Interfaces:**
- Consumes: Task 1 model and outbox functions.
- Produces: `createCheckoutTracker(input) -> Promise<CheckoutTracker>` where the tracker exposes `{ attemptId, supportCode, stage(stage, details), fail(error), linkOrder(order), complete() }` and none of the mutation methods reject.
- Produces: `getAllCheckoutAttempts() -> Promise<CheckoutAttempt[]>`.
- Produces: `updateCheckoutAttemptResolution(id, { resolutionStatus, adminNotes })`.
- Produces: `flushCheckoutAttemptOutbox(storage) -> Promise<{ flushed, remaining }>`.

- [ ] **Step 1: Write failing service contract tests**

Use source-contract assertions plus injected persistence tests for the failure-isolated tracker factory. Assert Firestore operations use the `checkoutAttempts` collection, `arrayUnion` for unique events, and `Timestamp` conversion for `createdAt`, `updatedAt`, and `expiresAt`. Prove a rejected persistence callback causes an outbox entry but `tracker.stage(...)` resolves.

```js
const tracker = await createCheckoutTrackerSession(input, {
  persistCreate: async () => { throw new Error('offline'); },
  persistUpdate: async () => { throw new Error('offline'); },
  enqueue: operation => queued.push(operation),
  generators: fixedGenerators,
});
await assert.doesNotReject(tracker.stage('details_validated'));
assert.equal(tracker.supportCode, 'CHK-7K2M9Q');
assert.deepEqual(queued.map(item => item.type), ['create', 'update']);
```

- [ ] **Step 2: Run service tests and verify RED**

Run: `node --test tests/checkoutAttemptService.test.mjs`

Expected: FAIL because the tracking service does not exist.

- [ ] **Step 3: Implement persistence and tracker session**

Implement production Firestore adapters with `setDoc`, `updateDoc`, `getDocs`, `query`, `orderBy`, `arrayUnion`, `serverTimestamp`, and `Timestamp`. Every queued operation contains a stable `operationId`, attempt ID, operation type, and plain JSON payload. Flush sequentially and remove an operation only after it succeeds; stop on the first failure to preserve event order.

The tracker performs these exact state changes:

```js
stage('order_saved', { order })
// currentStage = 'order_saved'; linkedOrderDocumentId/orderId are populated.

fail(error)
// result = 'failed'; resolutionStatus stays 'open'; sanitized failed event appended.

complete()
// currentStage = 'completed'; result = 'successful'; completed event appended.
```

Admin resolution updates accept only the three declared statuses, trim notes to 2,000 characters, and set `resolvedAt` only for `resolved`. Do not expose `clientWriteToken` from `getAllCheckoutAttempts`; strip it before returning records to the page.

- [ ] **Step 4: Write failing Firestore rule tests**

Assert the new rules contain a dedicated match block and enforce these contracts:

```text
allow get, list: if isAdmin();
allow create: if request.resource.data.clientWriteToken is string ...
allow update: if isAdmin() || isValidCheckoutAttemptClientUpdate();
allow delete: if false;
```

The public update helper must require the token to remain identical, keep immutable identity/snapshot/expiry fields unchanged, and allow changes only to `currentStage`, `result`, `updatedAt`, `events`, `linkedOrderDocumentId`, `linkedOrderId`, and `error`. Admin-only `resolutionStatus`, `adminNotes`, and `resolvedAt` are immutable through the public branch.

- [ ] **Step 5: Run rule tests and verify RED**

Run: `node --test tests/checkoutAttemptRules.test.mjs`

Expected: FAIL because `firestore.rules` has no `checkoutAttempts` block.

- [ ] **Step 6: Implement the checkout-attempt Firestore rules**

Add named helpers for valid client creation and updates. Require `expiresAt` after `request.time` and no later than `request.time + duration.value(181, 'd')`. Require exact allowed field sets with `keys().hasOnly(...)` and exact required fields with `keys().hasAll(...)`.

Firestore combines overlapping matches with logical OR, so the existing recursive admin fallback would otherwise bypass the explicit delete denial. Replace it with a top-level collection-variable fallback that excludes both protected collections:

```text
match /{collection}/{document=**} {
  allow read, write: if isAdmin()
    && collection != 'orders'
    && collection != 'checkoutAttempts';
}
```

Add assertions proving neither `orders` nor `checkoutAttempts` can inherit delete permission from the fallback.

- [ ] **Step 7: Run focused tests and commit**

Run: `node --test tests/checkoutAttemptService.test.mjs tests/checkoutAttemptRules.test.mjs`

Expected: all tests PASS.

```powershell
git add src/services/checkoutAttemptService.js firestore.rules tests/checkoutAttemptService.test.mjs tests/checkoutAttemptRules.test.mjs
git commit -m "feat: persist checkout diagnostics securely"
```

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
- Produces: checkout results containing `attemptId` and `supportCode` whenever tracker creation succeeds locally.

- [ ] **Step 1: Write failing orchestration tests**

Extend the existing callback event assertions to prove this sequence:

```js
assert.deepEqual(events, [
  'track:details_validated', 'create', 'track:order_saved',
  'verify', 'track:order_verified', 'promo', 'open',
  'track:whatsapp_opened', 'track:completed',
]);
```

For create and verification failures, assert `tracker.fail(error)` runs once and the original error is rethrown. For WhatsApp launch failure, assert the saved-order result remains successful from the order perspective, `whatsappOpened` is false, the tracking result is `failed`, and the support code remains returned for complaint lookup. Add a test where every tracker method throws and prove the existing checkout result and callback order are unchanged.

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

Wrap the business flow in `try/catch`, emit the exact stages in order, call `fail` before rethrowing business failures, and do not allow tracking callbacks to enter the business error path. Treat WhatsApp open failure as a tracker failure while keeping the existing saved-order retry result. Add `attemptId` and `supportCode` to both result variants.

- [ ] **Step 4: Create the tracker in the production adapter**

In `initiateWhatsAppCheckout`, call `createCheckoutTracker({ cartItems, total, userInfo, userId })`, pass the returned tracker into `runVerifiedCheckout`, and keep the current Firestore/order/WhatsApp dependencies unchanged. If the business flow rejects, attach `tracker.attemptId` and `tracker.supportCode` as explicit properties on that same error before rethrowing it so CartPage can display the complaint reference without replacing the original cause.

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

Render the second line only when a code exists. For a saved order whose WhatsApp launch failed, include the support code in the persistent saved-order panel. Preserve all current cart clearing rules and WhatsApp retry controls.

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

Assert the page imports the tracking service/model, loads attempts, derives summary counts, reads the initial `orderId` search parameter, and renders these exact labels:

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
Mark investigating
Mark resolved
```

Assert `App.jsx` lazy-loads the page and wraps both routes in `<ProtectedRoute requireAdmin>`. Update the expected Admin icon IDs to include `checkout-tracking`, and require the Admin home card description to mention customer checkout issues. Assert Admin Orders builds an encoded tracking link from `order.orderId`.

- [ ] **Step 2: Run admin tests and verify RED**

Run: `node --test tests/adminCheckoutTrackingPage.test.mjs tests/adminHomeIcons.test.mjs`

Expected: FAIL because the page and navigation do not exist.

- [ ] **Step 3: Implement the responsive admin page**

Follow existing admin page styles and use inline SVG through the existing `AdminIcon` pattern. Load records once, then use `filterCheckoutAttempts` for client-side search/filtering. Provide controls for free-text search, result, last stage, resolution status, start date, and end date. Default resolution filtering hides resolved entries.

Desktop uses a compact table; narrow screens use cards. Each row/card shows customer name, primary contact, formatted INR cost, support code, linked order ID, last stage, result, resolution status, and local attempt time. Expanding it shows items with quantity and price, chronological timeline, sanitized error details, a linked `/order/:documentId` action when available, notes textarea, and resolution buttons.

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
1. Deploy firestore.rules before or with the web release.
2. Deploy any generated Firestore indexes if Firebase reports one as required.
3. In Firestore TTL policies, enable checkoutAttempts.expiresAt.
4. Deploy the web build.
5. Confirm a test failure support code can be found under Admin → Checkout Tracking.
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

Place a test checkout with a deliberately blocked WhatsApp launch or simulated network failure. Confirm the customer sees a support code, `Admin → Checkout Tracking` finds it by that code, the name/cost/items are correct, the last stage matches the failure, notes persist, and marking the issue resolved hides it from the default list.
