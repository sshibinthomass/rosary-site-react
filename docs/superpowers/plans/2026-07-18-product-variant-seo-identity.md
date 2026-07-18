# Product Variant SEO Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each genuine product page use its Firebase `commonName` and `size` as a unique, consistent visible and machine-readable SEO identity without changing its URL.

**Architecture:** Centralize identity composition in `src/utils/productSeo.js`, then route browser rendering and build-time artifacts through those helpers. Keep Firebase storefront fields authoritative, preserve all canonical paths, and enforce the behavior with unit and generated-artifact tests before production verification.

**Tech Stack:** JavaScript ES modules, React 19, Node.js test runner, Vite, Firebase/Firestore, Vercel CLI.

## Global Constraints

- Use `commonName` as the variety name and append `size` when present.
- Never invent cultivar names or use a product ID as an SEO differentiator.
- Keep all existing product paths and canonical URLs unchanged.
- Keep independent catalogue entries as `Product`; do not add `ProductGroup` or `isVariantOf`.
- Do not change prices, inventory, availability, product IDs, or Firebase ownership of storefront fields.
- Write a failing automated test before each production-code behavior change.

---

### Task 1: Centralize Product SEO Identity

**Files:**
- Modify: `tests/productSeo.test.mjs`
- Modify: `src/utils/productSeo.js`

**Interfaces:**
- Consumes: merged product objects containing optional `commonName`, `size`, `title`, `name`, `merchant`, `schema`, `seo`, and `careGuide` fields.
- Produces: `getProductDisplayName(product): string`, `getProductVariantSummary(product): string`, and `findDuplicateProductSeoIdentities(products): Array<{ identity: string, productIds: string[] }>`.
- Produces updated behavior from `getProductMetaTitle`, `getProductMetaDescription`, `buildProductStructuredData`, and `buildBreadcrumbStructuredData`.

- [ ] **Step 1: Write failing identity tests**

Add imports for `getProductDisplayName`, `getProductVariantSummary`, `getProductCanonicalUrl`, and `findDuplicateProductSeoIdentities`, then add tests equivalent to:

```js
test('product SEO identity uses storefront common name and offered size', () => {
  const large = {
    id: '53',
    commonName: 'Haworthia attenuata Wide Stripe',
    size: 'Large Cluster',
    title: 'Zebra Haworthia',
    available: true,
    salesPrice: 79,
    merchant: { title: 'Zebra Haworthia' },
    schema: { name: 'Zebra Haworthia' },
    seo: { slug: 'zebra-haworthia-53', metaDescription: 'Shared care description.' },
  };
  const small = { ...large, id: '67', size: 'Small Rosette' };

  assert.equal(getProductDisplayName(large), 'Haworthia attenuata Wide Stripe – Large Cluster');
  assert.notEqual(getProductDisplayName(large), getProductDisplayName(small));
  assert.equal(getProductMetaTitle(large), 'Buy Haworthia attenuata Wide Stripe – Large Cluster Online');
  assert.match(getProductMetaDescription(large), /Haworthia attenuata Wide Stripe – Large Cluster/);
  assert.equal(getProductVariantSummary(large), 'Variety: Haworthia attenuata Wide Stripe. Offered size: Large Cluster.');
});

test('product SEO identity does not append a size already present in the common name', () => {
  assert.equal(getProductDisplayName({
    commonName: 'Zebra Haworthia Large Cluster',
    size: 'Large Cluster',
  }), 'Zebra Haworthia Large Cluster');
});

test('product SEO identity retains safe fallbacks and canonical paths', () => {
  const product = { id: '53', title: 'Zebra Haworthia', seo: { slug: 'zebra-haworthia-53' } };
  assert.equal(getProductDisplayName(product), 'Zebra Haworthia');
  assert.equal(getProductVariantSummary(product), 'Variety: Zebra Haworthia.');
  assert.equal(getProductCanonicalUrl(product), 'https://rosaryplanthouse.com/plant/53-zebra-haworthia/');
});

test('duplicate SEO identity detection reports colliding indexable products', () => {
  const duplicates = findDuplicateProductSeoIdentities([
    { id: '53', commonName: 'Zebra Haworthia', size: 'Large', seoStatus: 'published', identityVerified: true, available: true, salesPrice: 79 },
    { id: '67', commonName: 'Zebra Haworthia', size: 'Large', seoStatus: 'published', identityVerified: true, available: true, salesPrice: 69 },
  ]);
  assert.deepEqual(duplicates, [{ identity: 'Zebra Haworthia – Large', productIds: ['53', '67'] }]);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/productSeo.test.mjs`

Expected: FAIL because `getProductVariantSummary` is not exported and the existing display/meta helpers ignore `commonName + size`.

- [ ] **Step 3: Implement the identity and description helpers**

In `src/utils/productSeo.js`:

```js
function normalizeIdentityPart(value) {
  return compactText(value).replace(/^[\s–—,:;-]+|[\s–—,:;-]+$/g, '');
}

function includesIdentityPart(value, part) {
  return value.toLocaleLowerCase('en-IN').includes(part.toLocaleLowerCase('en-IN'));
}

export function getProductDisplayName(product = {}) {
  const variety = normalizeIdentityPart(
    product.commonName ||
    product.title ||
    product.name ||
    product.merchant?.title ||
    product.careGuide?.seoProductName ||
    product.schema?.name ||
    product.seo?.h1 ||
    product.careGuide?.plantName ||
    'Plant'
  );
  const size = normalizeIdentityPart(product.size);
  return size && !includesIdentityPart(variety, size) ? `${variety} – ${size}` : variety;
}

export function getProductVariantSummary(product = {}) {
  const variety = normalizeIdentityPart(product.commonName || product.title || product.name || getProductDisplayName(product));
  const size = normalizeIdentityPart(product.size);
  return size ? `Variety: ${variety}. Offered size: ${size}.` : `Variety: ${variety}.`;
}

export function findDuplicateProductSeoIdentities(products = []) {
  const groups = new Map();
  for (const product of products.filter(isSeoIndexable)) {
    const identity = getProductDisplayName(product);
    const key = identity.toLocaleLowerCase('en-IN');
    const group = groups.get(key) || { identity, productIds: [] };
    group.productIds.push(String(product.id));
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.productIds.length > 1);
}
```

Update saleable meta titles to use `getProductDisplayName(product)`. Prefix an existing meta-description fallback with the composed product identity when that identity is not already present. Update Product structured data to use the composed name and add `size` only when normalized `product.size` is non-empty. Keep canonical generation untouched.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test tests/productSeo.test.mjs`

Expected: PASS, including distinct common-name/size identities, no repeated size, structured-data size, and unchanged canonical URL.

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- src/utils/productSeo.js tests/productSeo.test.mjs
git commit -m "fix: distinguish product SEO identities"
```

### Task 2: Apply Identity to Static Artifacts and Product UI

**Files:**
- Modify: `tests/seoArtifacts.test.mjs`
- Modify: `scripts/seo/artifacts.mjs`
- Modify: `scripts/generate-seo-artifacts.js`
- Modify: `src/pages/ProductPage.jsx`
- Modify: `src/components/ProductCard.jsx`

**Interfaces:**
- Consumes: `getProductDisplayName(product)` and `getProductVariantSummary(product)` from Task 1.
- Produces: consistent Merchant feed titles/descriptions, static H1/summary/alt/breadcrumb/schema, React product H1/summary/alt/breadcrumb, and product-card names.

- [ ] **Step 1: Write failing artifact tests**

Extend the merged Firebase fixture with `size: 'Large Rosette'`. Assert that the artifact product produces:

```js
assert.match(feed, /Red tip – Large Rosette/);
assert.match(feed, /Variety: Red tip\. Offered size: Large Rosette\./);
assert.match(html, /<h1>Red tip – Large Rosette<\/h1>/);
assert.match(html, /class="seo-product-variant-summary">Variety: Red tip\. Offered size: Large Rosette\.<\/p>/);
assert.match(html, /alt="Red tip – Large Rosette from Rosary Plant House"/);
assert.match(html, /"name":"Red tip – Large Rosette"/);
assert.match(html, /"size":"Large Rosette"/);
assert.match(html, /<link rel="canonical" href="https:\/\/rosaryplanthouse\.com\/plant\/1-sempervivum-tectorum\/" \/>/);
```

Add a two-product feed assertion proving that equal enrichment titles with different common names or sizes emit different feed titles.

- [ ] **Step 2: Run artifact tests and verify RED**

Run: `node --test tests/seoArtifacts.test.mjs`

Expected: FAIL because the Merchant feed still prefers `merchant.title`, and static HTML has no specimen summary.

- [ ] **Step 3: Update build-time artifact rendering**

In `scripts/seo/artifacts.mjs`, import `getProductVariantSummary`. Change Merchant feed title to `getProductDisplayName(product)` and description to `getProductMetaDescription(product)`. In `renderStaticBody`, render:

```js
const variantSummary = getProductVariantSummary(product);
```

and immediately after the H1:

```html
<p class="seo-product-variant-summary">${escapeHtml(variantSummary)}</p>
```

Keep the existing canonical path, image, offer, and SKU logic unchanged.

In `scripts/generate-seo-artifacts.js`, import `findDuplicateProductSeoIdentities`. After the Firebase merge, run the duplicate check only when `firebaseProducts.length > 0`; throw an error listing each identity and product ID set if any authoritative merged identities still collide. This keeps local enrichment-only fallback builds usable while preventing a production deployment from publishing ambiguous identities.

- [ ] **Step 4: Update browser product rendering**

In `src/pages/ProductPage.jsx`, import both shared helpers, set `title = product ? getProductDisplayName(product) : ''`, and render `getProductVariantSummary(product)` below the H1. Continue using `title` for breadcrumbs, image alt text, cart, wishlist, and `productData.name`.

In `src/components/ProductCard.jsx`, import `getProductDisplayName` and replace the local title/name/commonName selection with that helper so catalogue links expose the same variety-and-size identity.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/productSeo.test.mjs tests/seoArtifacts.test.mjs`

Expected: PASS with distinct HTML/feed/schema identity and unchanged canonical URLs.

- [ ] **Step 6: Commit Task 2**

```powershell
git add -- scripts/seo/artifacts.mjs scripts/generate-seo-artifacts.js src/pages/ProductPage.jsx src/components/ProductCard.jsx tests/seoArtifacts.test.mjs
git commit -m "fix: publish distinct product variant signals"
```

### Task 3: Verify, Publish, and Inspect Production

**Files:**
- Modify: `docs/superpowers/plans/2026-07-18-product-variant-seo-identity.md` only to check completed steps.
- Generated by build and intentionally not committed unless already tracked and changed: `public/sitemap.xml`, `public/google-merchant-feed.tsv`, `public/product-seo-index.json`, `dist/**`.

**Interfaces:**
- Consumes: completed Task 1 and Task 2 implementation.
- Produces: verified `main` commit and a production Vercel deployment.

- [ ] **Step 1: Run all repository verification commands**

Run each command independently:

```powershell
npm test
npm run test:care
npm run test:care-catalog
npm run typecheck:care
npm run lint
npm run seo:image-audit
npm run build
```

Expected: every command exits 0; build reports static product/category/guide generation without duplicate-identity failure.

- [ ] **Step 2: Inspect generated identity and canonical stability**

Parse `dist/sitemap.xml`, all `dist/plant/*/index.html`, and `dist/google-merchant-feed.tsv`. Verify:

- Sitemap URL count and canonical URL set match the pre-change production sitemap.
- Every indexable product HTML has one title, description, H1, canonical, Product name, and image alt.
- No two indexable products share the same generated H1 or Product schema name in the production build, where authoritative Firebase common names and sizes are available.
- Former duplicate clusters now expose their Firebase common name and size.

- [ ] **Step 3: Commit the completed implementation plan**

```powershell
git add -- docs/superpowers/plans/2026-07-18-product-variant-seo-identity.md
git commit -m "docs: complete product variant SEO plan"
```

- [ ] **Step 4: Push and deploy production**

```powershell
git push origin main
vercel --prod --yes
```

Expected: push succeeds and Vercel returns the production deployment URL aliased to `https://rosaryplanthouse.com`.

- [ ] **Step 5: Verify representative live pages**

Fetch at least two products from formerly duplicated clusters and confirm HTTP 200, unique title/H1/description, self-canonical, distinct Product JSON-LD names and `size`, descriptive image alt text, and unchanged product paths. Confirm the live sitemap and Merchant feed contain those same paths and identities.

- [ ] **Step 6: Resubmit the sitemap**

Use the authenticated Search Console workflow already established for the property to submit `https://rosaryplanthouse.com/sitemap.xml`. Confirm the submission is accepted; do not submit hundreds of individual indexing requests.
