# Search Indexing Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return real 404 responses for unknown URLs and permanently redirect every supported legacy URL to its canonical public URL without changing intentional private-page indexing exclusions.

**Architecture:** A focused JavaScript module will build and validate the Vercel configuration from the product catalog and shared SEO path policy. A thin root `vercel.ts` entry point will load the catalog and export that generated configuration; static SEO generation will stop writing duplicate legacy product documents because Vercel now redirects those paths.

**Tech Stack:** Node.js 22, Node test runner, Vite/React, Vercel programmatic project configuration.

## Global Constraints

- Public canonical URLs must continue returning their existing generated HTML.
- Legacy `.html` and `/plant/{id}` URLs must remain usable through permanent redirects.
- Cart, wishlist, account, order, and admin routes must retain `X-Robots-Tag: noindex, nofollow`.
- `/care` and `/care/*` must remain direct-entry SPA routes.
- Unknown URLs must not be rewritten to an error document with HTTP 200.
- No paid bulk-redirect feature or per-request redirect function will be introduced.
- Existing unrelated untracked files must not be staged or modified.

---

### Task 1: Generate validated canonical routing configuration

**Files:**
- Create: `scripts/vercel-config.mjs`
- Create: `tests/vercelConfig.test.mjs`
- Create: `vercel.ts`
- Delete: `vercel.json`
- Modify: `tests/siteRoutesSeo.test.mjs:13-67`

**Interfaces:**
- Consumes: `isSeoIndexable(product)` and `getProductPath(product)` from `src/utils/productSeo.js`; `src/data/products.json`.
- Produces: `buildLegacyProductRedirects(products): Redirect[]` and `buildVercelConfig(products): VercelConfig` from `scripts/vercel-config.mjs`; `config` named export from `vercel.ts`.

- [ ] **Step 1: Write failing configuration-generation tests**

Create `tests/vercelConfig.test.mjs` with representative published, unpublished, malformed, and duplicate products:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLegacyProductRedirects,
  buildVercelConfig,
} from '../scripts/vercel-config.mjs';

const publishedProduct = {
  id: '1',
  available: true,
  identityVerified: true,
  seoStatus: 'published',
  title: 'Sempervivum tectorum',
  seo: { slug: 'sempervivum-tectorum-1' },
};

test('legacy product URLs permanently redirect to shared canonical paths', () => {
  assert.deepEqual(buildLegacyProductRedirects([publishedProduct]), [{
    source: '/plant/1',
    destination: '/plant/1-sempervivum-tectorum/',
    permanent: true,
  }]);
});

test('legacy redirects exclude products that are intentionally not indexable', () => {
  const draft = { ...publishedProduct, id: '2', seoStatus: 'draft' };
  assert.deepEqual(buildLegacyProductRedirects([draft]), []);
});

test('legacy redirect generation rejects invalid and duplicate catalog IDs', () => {
  assert.throws(() => buildLegacyProductRedirects(null), /array/i);
  assert.throws(
    () => buildLegacyProductRedirects([{ ...publishedProduct, id: '' }]),
    /product id/i
  );
  assert.throws(
    () => buildLegacyProductRedirects([publishedProduct, { ...publishedProduct }]),
    /duplicate legacy product route/i
  );
});

test('Vercel config redirects legacy pages and preserves private route exclusions', () => {
  const config = buildVercelConfig([publishedProduct]);
  const redirects = new Map(config.redirects.map((entry) => [entry.source, entry]));
  const noindexSources = new Set(
    config.headers
      .filter((entry) => entry.headers.some((header) => (
        header.key === 'X-Robots-Tag' && header.value === 'noindex, nofollow'
      )))
      .map((entry) => entry.source)
  );

  for (const [source, destination] of [
    ['/index.html', '/'],
    ['/shop.html', '/shop'],
    ['/faq.html', '/faq'],
    ['/cart.html', '/cart'],
    ['/admin/orders.html', '/admin/orders'],
  ]) {
    assert.deepEqual(redirects.get(source), { source, destination, permanent: true });
  }

  assert.deepEqual(redirects.get('/plant/1'), {
    source: '/plant/1',
    destination: '/plant/1-sempervivum-tectorum/',
    permanent: true,
  });

  for (const source of ['/cart', '/wishlist', '/account', '/orders', '/order/(.*)', '/admin', '/admin/(.*)']) {
    assert.ok(noindexSources.has(source), `${source} should remain noindex`);
  }
});

test('Vercel config rewrites only supported SPA routes and has no soft-404 catch-all', () => {
  const config = buildVercelConfig([publishedProduct]);
  const rewrites = new Map(config.rewrites.map((entry) => [entry.source, entry.destination]));

  for (const source of [
    '/cart', '/wishlist', '/account', '/orders', '/order/(.*)',
    '/admin', '/admin/(.*)', '/care', '/care/(.*)',
  ]) {
    assert.equal(rewrites.get(source), '/index.html');
  }

  assert.equal(rewrites.has('/(.*)'), false);
  assert.equal(config.rewrites.some((entry) => entry.destination === '/404.html'), false);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
node --test tests/vercelConfig.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/vercel-config.mjs`.

- [ ] **Step 3: Implement the minimal configuration builder**

Create `scripts/vercel-config.mjs`. Keep the existing cache/header policy, define explicit permanent redirects for every current `.html` alias, append validated indexable-product redirects, retain private rewrites, add `/care` rewrites, and omit all 404 rewrites:

```js
import { getProductPath, isSeoIndexable } from '../src/utils/productSeo.js';

const PRIVATE_ROUTES = [
  '/cart',
  '/wishlist',
  '/account',
  '/orders',
  '/order/(.*)',
  '/admin',
  '/admin/(.*)',
];

const HTML_REDIRECTS = [
  ['/index.html', '/'],
  ['/shop.html', '/shop'],
  ['/faq.html', '/faq'],
  ['/policies.html', '/policies'],
  ['/contact.html', '/contact'],
  ['/about.html', '/about'],
  ['/reviews.html', '/reviews'],
  ['/insta-reviews.html', '/insta-reviews'],
  ['/guides.html', '/guides'],
  ['/cart.html', '/cart'],
  ['/wishlist.html', '/wishlist'],
  ['/account.html', '/account'],
  ['/orders.html', '/orders'],
  ['/admin.html', '/admin'],
  ['/admin/users.html', '/admin/users'],
  ['/admin/orders.html', '/admin/orders'],
  ['/admin/orders/new.html', '/admin/orders/new'],
  ['/admin/products.html', '/admin/products'],
  ['/admin/limited.html', '/admin/limited'],
  ['/admin/export.html', '/admin/export'],
  ['/admin/analysis.html', '/admin/analysis'],
  ['/admin/plant-analysis.html', '/admin/plant-analysis'],
  ['/admin/order-analysis.html', '/admin/order-analysis'],
];

export function buildLegacyProductRedirects(products) {
  if (!Array.isArray(products)) throw new TypeError('Product catalog must be an array.');

  const seenSources = new Set();
  const redirects = [];

  for (const product of products) {
    const id = String(product?.id || '').trim();
    if (!id) throw new Error('Every catalog entry must have a product ID.');
    if (!isSeoIndexable(product)) continue;

    const source = `/plant/${id}`;
    if (seenSources.has(source)) {
      throw new Error(`Duplicate legacy product route: ${source}`);
    }
    seenSources.add(source);

    const destination = getProductPath(product);
    if (source === destination || `${source}/` === destination) {
      continue;
    }
    redirects.push({ source, destination, permanent: true });
  }

  return redirects;
}

export function buildVercelConfig(products) {
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    git: { deploymentEnabled: { 'gh-pages': false } },
    headers: [
      {
        source: '/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/sale_plants/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      ...PRIVATE_ROUTES.map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ],
    redirects: [
      {
        source: '/(.*)',
        has: [{ type: 'host', value: 'www.rosaryplanthouse.com' }],
        destination: 'https://rosaryplanthouse.com/$1',
        permanent: true,
      },
      ...HTML_REDIRECTS.map(([source, destination]) => ({ source, destination, permanent: true })),
      ...buildLegacyProductRedirects(products),
    ],
    rewrites: [
      ...PRIVATE_ROUTES.map((source) => ({ source, destination: '/index.html' })),
      { source: '/care', destination: '/index.html' },
      { source: '/care/(.*)', destination: '/index.html' },
    ],
  };
}
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```powershell
node --test tests/vercelConfig.test.mjs
```

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Replace the static configuration entry point**

Create `vercel.ts`:

```ts
import { readFileSync } from 'node:fs';

import { buildVercelConfig } from './scripts/vercel-config.mjs';

const products = JSON.parse(
  readFileSync(new URL('./src/data/products.json', import.meta.url), 'utf8')
);

export const config = buildVercelConfig(products);
```

Delete `vercel.json` because Vercel accepts only one project configuration entry point.

- [ ] **Step 6: Update the existing routing-policy tests**

In `tests/siteRoutesSeo.test.mjs`, import the real generated configuration instead of parsing `vercel.json`:

```js
import products from '../src/data/products.json' with { type: 'json' };
import { buildVercelConfig } from '../scripts/vercel-config.mjs';

const vercelConfig = buildVercelConfig(products);
```

Replace the first three Vercel tests with assertions that:

```js
assert.ok(vercelConfig.redirects.some((entry) => (
  entry.source === '/index.html' && entry.destination === '/' && entry.permanent === true
)));
assert.ok(vercelConfig.redirects.some((entry) => (
  entry.source === '/shop.html' && entry.destination === '/shop' && entry.permanent === true
)));
assert.equal(vercelConfig.rewrites.some((entry) => entry.destination === '/404.html'), false);
assert.equal(vercelConfig.rewrites.some((entry) => entry.source === '/(.*)'), false);
```

Retain the existing private-route assertions, changing the expected SPA destination to the generated configuration's `/index.html` entries. Add assertions for `/care` and `/care/(.*)`.

- [ ] **Step 7: Run all Node tests**

Run:

```powershell
npm test
```

Expected: all `tests/*.test.mjs` tests pass with 0 failures.

- [ ] **Step 8: Commit the routing generator**

```powershell
git add -- scripts/vercel-config.mjs tests/vercelConfig.test.mjs tests/siteRoutesSeo.test.mjs vercel.ts vercel.json
git commit -m "fix: canonicalize legacy routes on Vercel"
```

---

### Task 2: Stop generating duplicate legacy product documents

**Files:**
- Modify: `scripts/generate-seo-artifacts.js:310-323`
- Modify: `tests/siteRoutesSeo.test.mjs`

**Interfaces:**
- Consumes: the `/plant/{id}` redirects produced by `buildVercelConfig(products)` in Task 1.
- Produces: `dist/plant/{id}-{slug}/index.html` canonical product documents only; no `dist/plant/{id}/index.html` duplicates.

- [ ] **Step 1: Write the failing artifact-policy regression test**

Add to `tests/siteRoutesSeo.test.mjs`:

```js
test('SEO artifact generation writes only canonical product directories', () => {
  const generatorSource = readText('scripts/generate-seo-artifacts.js');

  assert.match(generatorSource, /const canonicalPath = getProductPath\(product\)/);
  assert.doesNotMatch(generatorSource, /const legacyPath = `plant\/\$\{product\.id\}`/);
  assert.doesNotMatch(generatorSource, /legacyDir/);
});
```

- [ ] **Step 2: Run the regression test and verify RED**

Run:

```powershell
node --test --test-name-pattern="writes only canonical product directories" tests/siteRoutesSeo.test.mjs
```

Expected: FAIL because `generate-seo-artifacts.js` still declares `legacyPath` and `legacyDir`.

- [ ] **Step 3: Remove legacy static product generation**

Change the product loop in `scripts/generate-seo-artifacts.js` to:

```js
for (const product of publicProducts) {
  const pageHtml = buildStaticProductHtml({ indexHtml, product, baseUrl: BASE_URL });
  const canonicalPath = getProductPath(product).replace(/^\//, '');
  const canonicalDir = path.join(distDir, canonicalPath);
  await fs.mkdir(canonicalDir, { recursive: true });
  await fs.writeFile(path.join(canonicalDir, 'index.html'), pageHtml, 'utf8');
}
```

- [ ] **Step 4: Run the regression test and verify GREEN**

Run:

```powershell
node --test --test-name-pattern="writes only canonical product directories" tests/siteRoutesSeo.test.mjs
```

Expected: 1 matching test passes, 0 fail.

- [ ] **Step 5: Run the production build**

Run:

```powershell
npm run build
```

Expected: exit code 0; output reports generated static plant SEO pages and creates `dist/404.html`.

- [ ] **Step 6: Verify generated artifacts directly**

Run:

```powershell
Test-Path dist\404.html
Test-Path dist\plant\1\index.html
Get-ChildItem dist\plant -Directory | Where-Object Name -Like '1-*' | Select-Object -First 1 -ExpandProperty FullName
```

Expected: `True`, then `False`, then one canonical product directory path.

- [ ] **Step 7: Run the full verification suite**

Run:

```powershell
npm test
npm run lint
npm run build
```

Expected: all tests pass, ESLint exits 0, and the production build exits 0.

- [ ] **Step 8: Review the final diff and commit**

```powershell
git diff --check
git status --short
git diff -- scripts/generate-seo-artifacts.js tests/siteRoutesSeo.test.mjs
git add -- scripts/generate-seo-artifacts.js tests/siteRoutesSeo.test.mjs
git commit -m "fix: stop publishing duplicate product pages"
```

Do not stage `.playwright-cli/`, `.playwright-mcp/`, `output/`, or screenshot files.

---

### Task 3: Deployment response verification

**Files:**
- No source changes.

**Interfaces:**
- Consumes: a Vercel deployment containing Tasks 1 and 2.
- Produces: evidence that production response codes match the routing contract.

- [ ] **Step 1: Deploy through the repository's normal Vercel workflow**

Do not create a manual production deployment unless the user explicitly requests it. If the repository deploys from commits, wait for that deployment before continuing.

- [ ] **Step 2: Check representative production responses**

```powershell
curl.exe -sS -I https://rosaryplanthouse.com/plant/1
curl.exe -sS -I https://rosaryplanthouse.com/shop.html
curl.exe -sS -I https://rosaryplanthouse.com/cart
curl.exe -sS -I https://rosaryplanthouse.com/this-page-must-not-exist
```

Expected:

- `/plant/1`: `308` with `Location: /plant/1-sempervivum-tectorum/`.
- `/shop.html`: `308` with `Location: /shop`.
- `/cart`: `200` with `X-Robots-Tag: noindex, nofollow`.
- unknown URL: `404`, rendering the custom error page.

- [ ] **Step 3: Request Search Console validation**

Only after the deployed HTTP checks match the expected responses, use Search Console's **Validate Fix** action for the soft-404 and duplicate URL categories. Intentional `noindex` exclusions do not require validation.
