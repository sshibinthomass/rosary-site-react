# Title-First Storefront Product Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display `product.title` before common-name fields across current customer-facing product surfaces without changing any SEO output or source product data.

**Architecture:** Add a presentation-only `getStorefrontProductTitle(product)` utility that owns title precedence, size formatting, and legacy fallbacks. Customer UI and new cart/wishlist snapshots use that helper; `productSeo.js` and every metadata, schema, canonical, path, artifact, and search-index call continue using their existing inputs.

**Tech Stack:** React 19, JavaScript ES modules, Node.js test runner, Vite, ESLint

## Global Constraints

- Prefer `product.title`.
- Append `product.size` when the selected title does not already contain it.
- Fall back to `product.commonName`, then `product.name`, then `Plant`.
- Do not change `src/utils/productSeo.js` or the behavior of any SEO helper.
- Do not change Firestore, Excel, local product records, generated SEO artifacts, slugs, sitemap output, or search indexing.
- Preserve the existing SEO-specific product name passed to the `SEO` component on each surface.
- Do not change admin screens or completed historical-order snapshots.
- Existing cart/wishlist snapshots may retain their stored name; new or re-added items use the title-first name.

## File Structure

- Create `src/utils/productPresentation.js`: presentation-only title selection and size formatting.
- Create `tests/productPresentation.test.mjs`: direct behavioral tests for the new utility.
- Create `tests/storefrontProductTitles.test.mjs`: customer-surface and SEO-boundary regression checks.
- Modify `src/components/ProductCard.jsx`: title-first card, accessibility, cart, and wishlist identity while preserving path generation.
- Modify `src/components/ProductModal.jsx`: title-first Quick View identity while preserving its existing SEO product-data name.
- Modify `src/pages/ProductPage.jsx`: title-first visible detail identity while preserving its existing SEO product-data name.
- Modify `src/pages/ContentHubPage.jsx`: title-first visible recommendation identity.
- Modify `src/components/ProductCareDetails.jsx`: title-first accessible care-region identity.
- Modify `src/components/ProductModalWrapper.jsx`: title-first wishlist snapshots from Quick View.
- Modify `src/context/CartContext.jsx`: title-first names for newly created cart and wishlist snapshots.
- Modify `tests/productVariantPublishing.test.mjs`: replace obsolete common SEO-helper UI assertions with separated storefront/SEO assertions.

---

### Task 1: Presentation-Only Product Title Utility

**Files:**
- Create: `tests/productPresentation.test.mjs`
- Create: `src/utils/productPresentation.js`

**Interfaces:**
- Consumes: Product-like objects containing optional `title`, `commonName`, `name`, and `size` string fields.
- Produces: `getStorefrontProductTitle(product = {}): string`.

- [ ] **Step 1: Write the failing unit tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { getStorefrontProductTitle } from '../src/utils/productPresentation.js';

test('storefront product title prefers title and appends the offered size', () => {
  assert.equal(getStorefrontProductTitle({
    title: 'Sempervivum tectorum',
    commonName: 'Red tip',
    name: 'Red tip',
    size: '(1.5"-2")',
  }), 'Sempervivum tectorum – (1.5"-2")');
});

test('storefront product title does not append a size already in the title', () => {
  assert.equal(getStorefrontProductTitle({
    title: 'Haworthia cooperi Large Cluster',
    commonName: 'Stone',
    size: 'Large Cluster',
  }), 'Haworthia cooperi Large Cluster');
});

test('storefront product title uses approved legacy fallbacks', () => {
  assert.equal(getStorefrontProductTitle({ commonName: 'Red tip' }), 'Red tip');
  assert.equal(getStorefrontProductTitle({ name: 'Legacy plant' }), 'Legacy plant');
  assert.equal(getStorefrontProductTitle({}), 'Plant');
});

test('storefront product title ignores blank identity fields and normalizes whitespace', () => {
  assert.equal(getStorefrontProductTitle({
    title: '   ',
    commonName: '  Yellow   Flower ',
    name: 'Legacy',
    size: '  Small  ',
  }), 'Yellow Flower – Small');
});
```

- [ ] **Step 2: Run the test and verify the missing module fails**

Run: `node --test tests/productPresentation.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/utils/productPresentation.js`.

- [ ] **Step 3: Implement the minimal presentation helper**

```js
function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function getStorefrontProductTitle(product = {}) {
  const title = compactText(product.title)
    || compactText(product.commonName)
    || compactText(product.name)
    || 'Plant';
  const size = compactText(product.size);

  return size && !title.toLocaleLowerCase('en-IN').includes(size.toLocaleLowerCase('en-IN'))
    ? `${title} – ${size}`
    : title;
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/productPresentation.test.mjs`

Expected: 4 tests pass.

- [ ] **Step 5: Commit the utility and tests**

```powershell
git add -- src/utils/productPresentation.js tests/productPresentation.test.mjs
git commit -m "feat: add title-first storefront identity"
```

---

### Task 2: Customer-Facing Product Surfaces

**Files:**
- Create: `tests/storefrontProductTitles.test.mjs`
- Modify: `tests/productVariantPublishing.test.mjs`
- Modify: `src/components/ProductCard.jsx`
- Modify: `src/components/ProductModal.jsx`
- Modify: `src/pages/ProductPage.jsx`
- Modify: `src/pages/ContentHubPage.jsx`
- Modify: `src/components/ProductCareDetails.jsx`

**Interfaces:**
- Consumes: `getStorefrontProductTitle(product)` from Task 1.
- Produces: Title-first visible cards, Quick View, product detail, content recommendation, and accessible care identities; unchanged SEO names and paths.

- [ ] **Step 1: Write failing source-boundary regression tests**

Create `tests/storefrontProductTitles.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sources = {
  card: fs.readFileSync(new URL('../src/components/ProductCard.jsx', import.meta.url), 'utf8'),
  modal: fs.readFileSync(new URL('../src/components/ProductModal.jsx', import.meta.url), 'utf8'),
  page: fs.readFileSync(new URL('../src/pages/ProductPage.jsx', import.meta.url), 'utf8'),
  contentHub: fs.readFileSync(new URL('../src/pages/ContentHubPage.jsx', import.meta.url), 'utf8'),
  care: fs.readFileSync(new URL('../src/components/ProductCareDetails.jsx', import.meta.url), 'utf8'),
};

test('customer product surfaces use the title-first presentation helper', () => {
  for (const [surface, source] of Object.entries(sources)) {
    assert.match(source, /getStorefrontProductTitle/, `${surface} should use the storefront title helper`);
  }
});

test('product page keeps its SEO product name separate from its visible title', () => {
  assert.match(sources.page, /const seoName = product \? getProductDisplayName\(product\) : ''/);
  assert.match(sources.page, /const title = product \? getStorefrontProductTitle\(product\) : ''/);
  assert.match(sources.page, /productData=\{\{ \.\.\.product, seo: \{ \.\.\.\(product\.seo \|\| \{\}\), canonicalUrl \}, name: seoName, price \}\}/);
});

test('quick view keeps its existing SEO product name separate from its visible title', () => {
  assert.match(sources.modal, /const seoName = product\?\.title \|\| product\?\.name \|\| product\?\.commonName/);
  assert.match(sources.modal, /const title = getStorefrontProductTitle\(product\)/);
  assert.match(sources.modal, /name: seoName, price/);
});

test('product cards preserve SEO path generation while displaying storefront titles', () => {
  assert.match(sources.card, /const seoName = getProductDisplayName\(product\)/);
  assert.match(sources.card, /const name = getStorefrontProductTitle\(product\)/);
  assert.match(sources.card, /getProductPath\(\{ \.\.\.product, title: seoName \}\)/);
});
```

Update the first test in `tests/productVariantPublishing.test.mjs` to assert the separated presentation and SEO helpers:

```js
test('browser product surfaces separate storefront titles from SEO identities', () => {
  assert.match(productPageSource, /getStorefrontProductTitle/);
  assert.match(productPageSource, /getProductDisplayName/);
  assert.match(productPageSource, /getProductVariantSummary/);
  assert.match(productCardSource, /getStorefrontProductTitle/);
  assert.match(productCardSource, /getProductDisplayName/);
  assert.doesNotMatch(productCardSource, /\{product\.size\s*&&/);
});
```

- [ ] **Step 2: Run the source tests and verify they fail on missing storefront-helper usage**

Run: `node --test tests/storefrontProductTitles.test.mjs tests/productVariantPublishing.test.mjs`

Expected: FAIL because the customer surfaces do not yet import or call `getStorefrontProductTitle`.

- [ ] **Step 3: Update ProductCard while preserving its SEO path**

Import `getStorefrontProductTitle` from `../utils/productPresentation`. Replace the existing identity setup with:

```js
const seoName = getProductDisplayName(product);
const name = getStorefrontProductTitle(product);
const productPath = getProductPath({ ...product, title: seoName });
```

Continue using `name` for visible text, accessibility labels, cart payloads, and wishlist payloads. Do not change `getProductPath`, `getProductDisplayName`, or any SEO utility.

- [ ] **Step 4: Update ProductPage while preserving metadata and structured data**

Import `getStorefrontProductTitle` from `../utils/productPresentation`. Replace the single identity with:

```js
const seoName = product ? getProductDisplayName(product) : '';
const title = product ? getStorefrontProductTitle(product) : '';
```

Use `title` for the existing visible UI, image labels, cart payload, and wishlist payload. In the `SEO` component, preserve the pre-change schema identity by changing only its product-data name reference:

```jsx
productData={{ ...product, seo: { ...(product.seo || {}), canonicalUrl }, name: seoName, price }}
```

Leave `getProductMetaTitle`, `getProductMetaDescription`, canonical, robots, breadcrumb schema, FAQ schema, and `getProductVariantSummary` unchanged.

- [ ] **Step 5: Update Quick View while preserving its current SEO product-data name**

Import `getStorefrontProductTitle` from `../utils/productPresentation`. Preserve the pre-change SEO input and add the visible title:

```js
const seoName = product?.title || product?.name || product?.commonName;
const title = getStorefrontProductTitle(product);
```

Continue using `title` for visible text, accessibility labels, and the cart payload. Change the `SEO` product-data object to `name: seoName` so its pre-change schema input remains identical.

- [ ] **Step 6: Update remaining customer-facing recommendation and accessibility surfaces**

In `src/pages/ContentHubPage.jsx`, import `getStorefrontProductTitle`, calculate `const title = getStorefrontProductTitle(product)` inside `ProductSuggestion`, and use `title` for the recommendation image `alt` and visible heading. Leave `getProductPath`, price, content-hub schemas, and page SEO unchanged.

In `src/components/ProductCareDetails.jsx`, import `getStorefrontProductTitle` and replace only the care wrapper's accessible label:

```jsx
aria-label={`${getStorefrontProductTitle(product)} care details`}
```

Do not alter care copy, sections, or SEO utilities used elsewhere.

- [ ] **Step 7: Run focused tests**

Run: `node --test tests/productPresentation.test.mjs tests/storefrontProductTitles.test.mjs tests/productVariantPublishing.test.mjs tests/productSeo.test.mjs`

Expected: all focused tests pass, including the unchanged SEO behavior tests.

- [ ] **Step 8: Commit customer-facing surface changes**

```powershell
git add -- src/components/ProductCard.jsx src/components/ProductModal.jsx src/pages/ProductPage.jsx src/pages/ContentHubPage.jsx src/components/ProductCareDetails.jsx tests/storefrontProductTitles.test.mjs tests/productVariantPublishing.test.mjs
git commit -m "feat: show product titles across storefront"
```

---

### Task 3: New Cart and Wishlist Snapshots

**Files:**
- Modify: `tests/storefrontProductTitles.test.mjs`
- Modify: `src/components/ProductModalWrapper.jsx`
- Modify: `src/context/CartContext.jsx`

**Interfaces:**
- Consumes: `getStorefrontProductTitle(product)` from Task 1.
- Produces: Title-first `name` values for new cart and wishlist entries without migrating existing snapshots.

- [ ] **Step 1: Add failing cart/wishlist source-boundary tests**

Extend the `sources` object in `tests/storefrontProductTitles.test.mjs`:

```js
modalWrapper: fs.readFileSync(new URL('../src/components/ProductModalWrapper.jsx', import.meta.url), 'utf8'),
cartContext: fs.readFileSync(new URL('../src/context/CartContext.jsx', import.meta.url), 'utf8'),
```

Add:

```js
test('new cart and wishlist snapshots use title-first product names', () => {
  assert.match(sources.modalWrapper, /getStorefrontProductTitle/);
  assert.match(sources.modalWrapper, /name: getStorefrontProductTitle\(product\)/);
  assert.match(sources.cartContext, /const name = getStorefrontProductTitle\(product\)/);
  assert.match(sources.cartContext, /name,/);
  assert.match(sources.cartContext, /addToCartService\(user\.uid, \{ \.\.\.product, name \}, quantity\)/);
  assert.match(sources.cartContext, /addToWishlistService\(user\.uid, \{ \.\.\.product, name \}\)/);
});
```

- [ ] **Step 2: Run the regression test and verify it fails**

Run: `node --test tests/storefrontProductTitles.test.mjs`

Expected: FAIL because `ProductModalWrapper` and `CartContext` do not yet use the presentation helper.

- [ ] **Step 3: Update Quick View wishlist snapshots**

In `src/components/ProductModalWrapper.jsx`, import `getStorefrontProductTitle` and replace the current fallback expression in `handleToggleWishlist` with:

```js
name: getStorefrontProductTitle(product),
```

- [ ] **Step 4: Centralize new cart names in CartContext**

Import `getStorefrontProductTitle` from `../utils/productPresentation`.

At the start of `addToCart`, calculate:

```js
const name = getStorefrontProductTitle(product);
```

Build `productData` with `...product` before the normalized fields so an incoming legacy `product.name` cannot overwrite the title-first snapshot:

```js
const productData = {
  ...product,
  productId: product.id,
  name,
  price: product.salesPrice || product.price,
  imageUrl: product.imageUrl,
  quantity,
};
```

For logged-in persistence, call:

```js
await addToCartService(user.uid, { ...product, name }, quantity);
```

Repeat the same normalization in `addToWishlist`:

```js
const name = getStorefrontProductTitle(product);
const productData = {
  ...product,
  productId: product.id,
  name,
  price: product.salesPrice || product.price,
  imageUrl: product.imageUrl,
  addedAt: new Date().toISOString(),
};
```

Persist with:

```js
await addToWishlistService(user.uid, { ...product, name });
```

Do not modify `cartService.js`, `wishlistService.js`, existing snapshot loading, merge behavior, or historical orders.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/productPresentation.test.mjs tests/storefrontProductTitles.test.mjs tests/productVariantPublishing.test.mjs tests/productSeo.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 6: Commit cart and wishlist normalization**

```powershell
git add -- src/components/ProductModalWrapper.jsx src/context/CartContext.jsx tests/storefrontProductTitles.test.mjs
git commit -m "fix: persist storefront titles in new saved items"
```

---

### Task 4: Full Verification and Browser Acceptance

**Files:**
- Verify only; no planned production-file changes.

**Interfaces:**
- Consumes: Completed Tasks 1-3.
- Produces: Test, lint, build, and visual evidence that the title-first UI works and SEO stays unchanged.

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Vite and SEO artifact generation complete successfully. Confirm `git status --short` does not show generated SEO artifact changes.

- [ ] **Step 4: Start the local app and verify the Shop page**

Run: `npm run dev -- --host 127.0.0.1`

Open the local Shop page. Confirm:

- Product `#1` shows `Sempervivum tectorum – (1.5"-2")`.
- Product `#2` shows `Bergeranthus multiceps – (2"-3")`.
- Product `#4` shows `Haworthia cooperi var. truncata – (1.5"-2.5")`.
- Common names `Red tip`, `Yellow Flower`, and `Stone` are not the primary card headings.

- [ ] **Step 5: Verify Quick View, product detail, cart, and wishlist**

Confirm:

- Quick View uses the title-first identity.
- The individual product page visible heading uses the title-first identity.
- Adding from either surface produces the same title-first cart notification and line item.
- Adding to wishlist produces the same title-first saved line item.
- Existing prices, sizes, categories, care tiles, images, and actions still work.

- [ ] **Step 6: Verify the SEO boundary**

Inspect the rendered metadata and structured product JSON on the same product page. Confirm it matches the pre-change output asserted by `tests/productSeo.test.mjs` and that no SEO artifact files changed in git.

- [ ] **Step 7: Review final diff**

Run:

```powershell
git diff HEAD~3 --check
git status --short
```

Expected: no whitespace errors; only the planned implementation/test files and the user's pre-existing untracked files are present.
