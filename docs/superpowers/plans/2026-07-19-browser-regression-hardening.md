# Browser Regression Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix stale pincode locations, recover safely from WhatsApp launch failures, and force prompt service-worker update checks while keeping delivery details optional.

**Architecture:** Preserve Firestore verification as the order commit boundary. Represent WhatsApp launch as a recoverable post-commit outcome, clear dependent location state at pincode input time, and explicitly ask the browser registration to check for a new worker.

**Tech Stack:** React 19, Firebase/Firestore, Vite 7, vite-plugin-pwa/Workbox, Node test runner.

## Global Constraints

- Delivery details remain optional; blank details must not disable or reject checkout.
- WhatsApp retry must reuse the verified order and must not create another order or increment promo usage again.
- Offline support and outdated-cache cleanup remain enabled.
- Do not write test orders to production Firestore during verification.

---

### Task 1: Clear stale pincode-derived location

**Files:**
- Create: `src/utils/checkoutLocation.js`
- Modify: `src/pages/CartPage.jsx:155-260`
- Create: `tests/checkoutLocation.test.mjs`
- Modify: `tests/cartCheckoutFlow.test.mjs`

**Interfaces:**
- Produces: `normalizeCheckoutPincode(checkoutInfo, rawValue) -> CheckoutInfo`, returning the sanitized six-digit-or-shorter pincode with empty `district` and `state`.
- Consumes: existing `lookupPincode(pincode) -> Promise<{state, district}|null>`.

- [ ] **Step 1: Write failing pure-state and integration tests**

```js
import { normalizeCheckoutPincode } from '../src/utils/checkoutLocation.js';

test('changing a pincode clears the previous district and state', () => {
  assert.deepEqual(
    normalizeCheckoutPincode({ pincode: '643102', district: 'Nilgiris', state: 'Tamil Nadu' }, '000000'),
    { pincode: '000000', district: '', state: '' }
  );
});
```

Add source assertions that `CartPage` uses the helper before lookup and leaves the order-request button independent of required-field validation.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/checkoutLocation.test.mjs tests/cartCheckoutFlow.test.mjs`

Expected: FAIL because `src/utils/checkoutLocation.js` does not exist and CartPage does not use the helper.

- [ ] **Step 3: Implement the minimal location reset**

```js
export function normalizeCheckoutPincode(checkoutInfo, rawValue) {
  const pincode = String(rawValue || '').replace(/\D/g, '').slice(0, 6);
  return { ...checkoutInfo, pincode, district: '', state: '' };
}
```

In `handlePincodeChange`, apply this helper immediately. Use an incrementing request ref so a slow response for an older pincode cannot repopulate location fields after the input changes. Apply lookup results only when that request is still current.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/checkoutLocation.test.mjs tests/cartCheckoutFlow.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/checkoutLocation.js src/pages/CartPage.jsx tests/checkoutLocation.test.mjs tests/cartCheckoutFlow.test.mjs
git commit -m "fix: clear stale checkout locations"
```

### Task 2: Make WhatsApp launch failure recoverable

**Files:**
- Modify: `src/services/verifiedCheckout.js`
- Modify: `tests/verifiedCheckout.test.mjs`

**Interfaces:**
- Produces: `runVerifiedCheckout(...) -> {order, orderUrl, whatsappUrl, savedToFirestore: true, whatsappOpened: boolean, whatsappError?: string}` after exact server verification.
- Preserves: creation or verification failures reject before promo usage and WhatsApp handoff.

- [ ] **Step 1: Write the failing post-commit recovery test**

```js
test('verified checkout remains saved when WhatsApp cannot open', async () => {
  const fixture = createDependencies();
  fixture.dependencies.openExternalUrl = async () => {
    fixture.events.push('open');
    throw new Error('WhatsApp could not open');
  };

  const result = await runVerifiedCheckout(checkoutInput, fixture.dependencies);

  assert.deepEqual(fixture.events, ['create', 'verify', 'promo', 'open']);
  assert.equal(result.savedToFirestore, true);
  assert.equal(result.whatsappOpened, false);
  assert.equal(result.whatsappError, 'WhatsApp could not open');
});
```

Update the success expectation to require `whatsappOpened: true`.

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/verifiedCheckout.test.mjs`

Expected: FAIL because `runVerifiedCheckout` currently rejects when `openExternalUrl` throws.

- [ ] **Step 3: Implement recoverable handoff state**

Wrap only `openExternalUrl(whatsappUrl)` in `try/catch`. Return the verified order in both cases, set `whatsappOpened` accordingly, and include the caught message as `whatsappError`. Do not call creation, verification, or promo usage from any retry path.

- [ ] **Step 4: Run test and verify GREEN**

Run: `node --test tests/verifiedCheckout.test.mjs`

Expected: all verification and handoff tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/verifiedCheckout.js tests/verifiedCheckout.test.mjs
git commit -m "fix: preserve verified orders when WhatsApp fails"
```

### Task 3: Show the correct saved-order recovery UI

**Files:**
- Modify: `src/pages/CartPage.jsx:250-480`
- Modify: `tests/cartCheckoutFlow.test.mjs`

**Interfaces:**
- Consumes: `whatsappOpened` and `whatsappError` from Task 2.
- Produces: a confirmation panel that distinguishes successful handoff from a saved order awaiting WhatsApp retry.

- [ ] **Step 1: Write failing UI source regressions**

```js
test('cart treats WhatsApp launch failure as a saved order with retry', () => {
  assert.match(cartPageSource, /whatsappOpened/);
  assert.match(cartPageSource, /Your order is safely saved/);
  assert.match(cartPageSource, /Open WhatsApp again/);
  assert.match(cartPageSource, /if \(checkoutResult\?\.savedToFirestore\)/);
});
```

Also assert that no `required` attributes or blank-field validity gate is added to the delivery inputs/button.

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/cartCheckoutFlow.test.mjs`

Expected: FAIL because the confirmation panel always claims WhatsApp opened.

- [ ] **Step 3: Implement conditional confirmation copy**

Store `whatsappOpened` and `whatsappError` in `checkoutConfirmation`. When false, show “Your order is safely saved” and explain that WhatsApp could not open. Continue to clear the cart because `savedToFirestore` is true. Keep **Open WhatsApp again** wired directly to the stored URL.

- [ ] **Step 4: Run test and verify GREEN**

Run: `node --test tests/cartCheckoutFlow.test.mjs tests/verifiedCheckout.test.mjs`

Expected: all checkout UI and orchestration tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CartPage.jsx tests/cartCheckoutFlow.test.mjs
git commit -m "fix: show saved-order WhatsApp recovery"
```

### Task 4: Force a service-worker update check at startup

**Files:**
- Modify: `src/main.jsx:12-23`
- Modify: `tests/pwaConfig.test.mjs`

**Interfaces:**
- Consumes: `onRegisteredSW(swUrl, registration)` from `virtual:pwa-register`.
- Produces: one explicit `registration.update()` call on registration while retaining `onNeedRefresh -> updateSW(true)`.

- [ ] **Step 1: Write the failing registration-update test**

```js
assert.match(
  mainSource,
  /onRegisteredSW\([^)]*registration[^)]*\)[\s\S]*?registration\?\.update\(\)/
);
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/pwaConfig.test.mjs`

Expected: FAIL because the callback does not exist.

- [ ] **Step 3: Implement the explicit update check**

```js
onRegisteredSW(_swUrl, registration) {
  void registration?.update()
},
```

Keep `immediate: true`, `onNeedRefresh`, Workbox cleanup, and offline navigation fallback unchanged.

- [ ] **Step 4: Run test and verify GREEN**

Run: `node --test tests/pwaConfig.test.mjs`

Expected: all PWA configuration tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main.jsx tests/pwaConfig.test.mjs
git commit -m "fix: check for fresh service workers on startup"
```

### Task 5: Full and browser verification

**Files:**
- Verify only; do not create production records.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: zero failed tests.

- [ ] **Step 2: Run lint and distinguish branch regressions from baseline debt**

Run: `npm run lint`

Expected: no new errors in files added by this plan; repository-wide pre-existing lint failures may remain and must be reported exactly.

- [ ] **Step 3: Build the production PWA**

Run: `npm run build`

Expected: exit 0 with generated `dist/sw.js` and Workbox asset. Restore build-generated tracked SEO files afterward.

- [ ] **Step 4: Repeat in-app-browser scenarios**

Run the production preview locally and verify:

1. Blank delivery details remain allowed.
2. Valid pincode fills district/state; changing to an invalid pincode clears them.
3. The isolated original-ID harness returns a saved recoverable result when WhatsApp opening fails.
4. Cart recovery reuses the stored WhatsApp URL.
5. Offline reload still works.
6. A second marked build is picked up after the explicit registration update and activation cycle.

- [ ] **Step 5: Inspect branch state**

Run: `git status --short && git log --oneline main..HEAD`

Expected: only pre-existing unrelated untracked files remain; all implementation changes are committed.
