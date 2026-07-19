# Verified Order Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve every issued order link and prevent WhatsApp handoff until a newly created order is confirmed by a server-only Firestore read.

**Architecture:** Move checkout orchestration into a dependency-injected, Firebase-free module that can be tested with real functions and deterministic fakes. Keep Firestore access in `orderService`, replace destructive admin deletion with archival updates, and tighten rules so deployed clients cannot delete order documents. Register prompt PWA updates and initialize Auth immediately on singular order routes.

**Tech Stack:** React 19, Vite 7, Firebase/Firestore 12, Vite PWA/Workbox, Node.js built-in test runner, ESLint.

## Global Constraints

- WhatsApp must never open with an unverified order link.
- A failed or uncertain checkout must preserve the cart and delivery form.
- Issued `/order/:documentId` links must remain readable after an admin archive action.
- Firestore storefront clients must never permanently delete order documents.
- Do not change the existing Firestore order schema except for optional archive metadata.
- Do not migrate order creation to Cloud Functions in this change.

---

### Task 1: Server-verified checkout orchestration

**Files:**
- Create: `src/services/verifiedCheckout.js`
- Create: `tests/verifiedCheckout.test.mjs`
- Modify: `src/services/orderService.js`
- Modify: `src/services/whatsappCheckout.js`

**Interfaces:**
- Produces: `runVerifiedCheckout(input, dependencies) -> Promise<{order, orderUrl, whatsappUrl, savedToFirestore: true}>`.
- Produces: `getOrderByIdFromServer(documentId) -> Promise<Order|null>`.
- Consumes: existing `createOrder`, `getOrderUrl`, `generateWhatsAppOrderRequestUrl`, `incrementPromoUsage`, and `openExternalUrl` functions.

- [ ] **Step 1: Write failing orchestration tests**

Create tests that inject ordered callback fakes and assert this sequence: `create`, `verify`, optional `promo`, `open`. Add cases where verification returns `null`, a different document ID, or a different business `orderId`; each must reject before promo or WhatsApp callbacks execute.

```js
const result = await runVerifiedCheckout(input, dependencies);
assert.deepEqual(events, ['create', 'verify', 'promo', 'open']);
assert.equal(result.savedToFirestore, true);

await assert.rejects(
  runVerifiedCheckout(input, { ...dependencies, verifyOrder: async () => null }),
  /could not be verified/i
);
assert.deepEqual(events, ['create']);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/verifiedCheckout.test.mjs`

Expected: FAIL because `src/services/verifiedCheckout.js` does not exist.

- [ ] **Step 3: Implement the pure orchestration module**

```js
export async function runVerifiedCheckout(input, dependencies) {
  const originalAmount = input.cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const created = await dependencies.createOrder({
    orderId: dependencies.generateOrderId(),
    items: input.cartItems,
    totalAmount: input.total,
    originalAmount,
    customerInfo: input.userInfo,
    userId: input.userId,
    ...(input.promoInfo?.code ? {
      promoCode: input.promoInfo.code,
      discountAmount: input.promoInfo.discount,
      discountType: input.promoInfo.type,
      discountValue: input.promoInfo.value,
    } : {}),
  });
  const verified = await dependencies.verifyOrder(created.id);
  if (!verified || verified.id !== created.id || verified.orderId !== created.orderId) {
    throw new Error('Order could not be verified after saving');
  }
  const orderUrl = dependencies.getOrderUrl(verified.id);
  const whatsappUrl = dependencies.buildWhatsAppUrl(
    input.cartItems, input.total, input.userInfo, orderUrl,
    verified.orderId, input.promoInfo
  );
  if (input.promoInfo?.code) dependencies.incrementPromoUsage(input.promoInfo.code);
  await dependencies.openExternalUrl(whatsappUrl);
  return { order: verified, orderUrl, whatsappUrl, savedToFirestore: true };
}
```

Add `getDocFromServer` to the Firestore imports and implement `getOrderByIdFromServer` using the same result shape as `getOrderById`. Replace the timeout/fallback body in `initiateWhatsAppCheckout` with `runVerifiedCheckout` and production dependencies.

- [ ] **Step 4: Run focused and checkout-flow tests and verify GREEN**

Run: `node --test tests/verifiedCheckout.test.mjs tests/cartCheckoutFlow.test.mjs tests/orderWhatsapp.test.mjs`

Expected: all tests PASS with zero failures.

- [ ] **Step 5: Commit**

```powershell
git add src/services/verifiedCheckout.js src/services/orderService.js src/services/whatsappCheckout.js tests/verifiedCheckout.test.mjs
git commit -m "fix: verify orders before WhatsApp handoff"
```

### Task 2: Preserve cart state on unverified checkout

**Files:**
- Modify: `src/pages/CartPage.jsx`
- Modify: `tests/cartCheckoutFlow.test.mjs`

**Interfaces:**
- Consumes: `initiateWhatsAppCheckout(...)`, which now either returns a verified success or rejects.
- Produces: a checkout error path that keeps the checkout form open and never calls `finalizeCheckoutResult` or `clearCart` after rejection.

- [ ] **Step 1: Write failing source-contract tests**

```js
assert.match(cartPageSource, /Order was not confirmed\. Your cart is safe—please try again\./);
assert.match(cartPageSource, /catch \(err\)[\s\S]*setShowCheckout\(true\)/);
assert.doesNotMatch(cartPageSource, /Could not be saved before WhatsApp handoff/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/cartCheckoutFlow.test.mjs`

Expected: FAIL because the new customer-facing error and explicit form preservation are absent.

- [ ] **Step 3: Implement minimal cart error behavior**

In `handleCheckoutClick`, keep `finalizeCheckoutResult` exclusively in the success path. In the catch block call:

```js
setShowCheckout(true);
error('Order was not confirmed. Your cart is safe—please try again.');
```

Do not clear the cart, reset checkout fields, or create a success confirmation in the catch path.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/cartCheckoutFlow.test.mjs tests/verifiedCheckout.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/CartPage.jsx tests/cartCheckoutFlow.test.mjs
git commit -m "fix: preserve cart when order verification fails"
```

### Task 3: Replace destructive order deletion with archiving

**Files:**
- Modify: `src/services/orderService.js`
- Modify: `src/pages/AdminOrdersPage.jsx`
- Modify: `firestore.rules`
- Create: `tests/orderArchive.test.mjs`

**Interfaces:**
- Produces: `archiveOrder(orderId) -> Promise<{id, archived: true}>`.
- Consumes: existing Firestore `updateDoc` and `serverTimestamp`.
- Produces: admin archive actions for cancelled and delivered orders; no deployed UI calls `deleteDoc` for orders.

- [ ] **Step 1: Write failing archive and rules tests**

```js
assert.match(orderServiceSource, /export async function archiveOrder\(orderId\)/);
assert.match(orderServiceSource, /archived:\s*true/);
assert.doesNotMatch(orderServiceSource, /deleteDoc\(docRef\)/);
assert.match(adminSource, /archiveOrder/);
assert.doesNotMatch(adminSource, /permanently delete/i);
assert.match(rulesSource, /match \/orders\/\{orderId\}[\s\S]*allow delete: if false;/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/orderArchive.test.mjs`

Expected: FAIL because the app still exports and invokes permanent deletion.

- [ ] **Step 3: Implement archival**

Replace `deleteOrder` with:

```js
export async function archiveOrder(orderId) {
  const docRef = doc(db, COLLECTION_NAME, orderId);
  await updateDoc(docRef, {
    archived: true,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: orderId, archived: true };
}
```

Update admin imports, handlers, confirmation text, success text, and button labels from delete to archive. Preserve existing filtering behavior by removing newly archived records from the current in-memory operational list. Change the order rule to `allow delete: if false;`.

- [ ] **Step 4: Run archive, rules, and admin tests and verify GREEN**

Run: `node --test tests/orderArchive.test.mjs tests/firestoreRules.test.mjs tests/adminOrders*.test.mjs`

If the shell does not expand the wildcard, run `npm test` instead. Expected: all applicable tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/services/orderService.js src/pages/AdminOrdersPage.jsx firestore.rules tests/orderArchive.test.mjs
git commit -m "fix: archive orders instead of deleting them"
```

### Task 4: Refresh web releases and remove order-page startup delay

**Files:**
- Modify: `src/context/AuthContext.jsx`
- Modify: `src/main.jsx`
- Modify: `vite.config.js`
- Create: `tests/orderRouteStartup.test.mjs`
- Modify: `tests/pwaConfig.test.mjs` if present; otherwise create it.

**Interfaces:**
- Produces: immediate Auth initialization for `/order/:orderId`.
- Produces: immediate service-worker registration/update and cleanup of outdated Workbox caches.

- [ ] **Step 1: Write failing route and PWA tests**

```js
assert.match(authSource, /account\|admin\|orders\|order\|care/);
assert.match(mainSource, /registerSW\(\{\s*immediate:\s*true/);
assert.match(viteSource, /cleanupOutdatedCaches:\s*true/);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/orderRouteStartup.test.mjs tests/pwaConfig.test.mjs`

Expected: FAIL because singular `/order`, explicit registration, and cache cleanup are absent.

- [ ] **Step 3: Implement startup and update behavior**

Change the Auth expression to:

```js
const shouldLoadImmediately = /^\/(account|admin|orders|order|care)(\/|\.html|$)/.test(pathname);
```

In `main.jsx`, import `registerSW` from `virtual:pwa-register` and register immediately:

```js
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true);
  },
});
```

Add `cleanupOutdatedCaches: true` to Workbox configuration. Keep the existing cache strategy and size limit unchanged.

- [ ] **Step 4: Run focused tests and production build and verify GREEN**

Run: `node --test tests/orderRouteStartup.test.mjs tests/pwaConfig.test.mjs`

Run: `npm run build`

Expected: tests PASS and build exits 0 with generated service-worker assets.

- [ ] **Step 5: Commit**

```powershell
git add src/context/AuthContext.jsx src/main.jsx vite.config.js tests/orderRouteStartup.test.mjs tests/pwaConfig.test.mjs
git commit -m "fix: refresh stale checkout releases"
```

### Task 5: Full verification and handoff

**Files:**
- Verify all modified files.

**Interfaces:**
- Consumes all prior task outputs.
- Produces a verified branch ready for deployment and Firestore rule publication.

- [ ] **Step 1: Run the complete regression suite**

Run: `npm test`

Expected: exit 0 with zero failed tests.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit 0 with zero errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit 0 and updated `dist` output.

- [ ] **Step 4: Inspect branch scope**

Run: `git status --short; git diff main...HEAD --stat; git log --oneline main..HEAD`

Expected: only the approved design, plan, tests, and implementation files are tracked; unrelated pre-existing untracked files remain untouched.

- [ ] **Step 5: Report deployment requirements**

State explicitly that the web build must be deployed and `firestore.rules` must be published for client-side delete denial to take effect.
