# SEO GEO AEO Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Rosary Plant House maximally eligible and trustworthy for Google Search, Google AI Overviews / AI Mode / Gemini-powered search experiences, ChatGPT / OpenAI Search, Bing / Copilot, and other AI answer surfaces without relying on unsupported "AI SEO" tricks.

**Architecture:** Keep the current Vite React storefront, but make one shared SEO policy layer decide which products are indexable, which pages receive `noindex`, which URLs enter sitemaps, and which products enter the Merchant feed. Continue generating crawler-friendly static HTML for public SEO pages, then expand that generator to include policies, categories, entity pages, care guides, problem guides, split sitemaps, image sitemaps, and validation reports.

**Tech Stack:** React 19, Vite 7, React Router 7, `react-helmet-async`, Node ESM build scripts, Firebase / Firestore, Vercel, schema.org JSON-LD, Google Merchant feed TSV, `robots.txt`, XML sitemaps, Node test runner.

## Global Constraints

- No implementation can guarantee rank #1; the target is crawlability, correctness, authority, and measurable eligibility.
- Do not index uncertain plant identities. Plant taxonomy trust is more important than page count.
- Keep the current `/plant/{id}-{slug}/` product URL format for the first SEO cleanup to avoid unnecessary URL migration risk.
- Use `https://rosaryplanthouse.com` as the single canonical host. Redirect `www` to the apex domain.
- Static generated HTML must contain the important product, guide, category, and policy content before React hydration.
- Structured data must match visible page text. Do not add hidden schema facts that users cannot read on the page.
- Use `noindex,follow` for useful but not-yet-indexable storefront pages so crawlers can still discover linked approved pages.
- Keep cart, account, wishlist, admin, order-owner, and other private utility routes out of public sitemaps.
- Add tests before each behavior change and run `npm test` after every task.
- Do not prioritize `llms.txt` for Google visibility; Google explicitly says AI features do not need special AI text files or special AI schema.

---

## Fresh Research Basis

- Google says SEO fundamentals remain relevant for generative AI search because AI features use Search ranking, retrieval, and query fan-out over indexed pages.
- Google says pages need to be crawlable, indexable, snippet-eligible, internally linked, textually visible, fast, and backed by helpful people-first content.
- Google says Merchant Center and Google Business Profile details can help ecommerce and local-business visibility in AI responses and other Search results.
- Google says no special schema, AI text file, or `llms.txt` is needed for AI Overviews or AI Mode.
- Google product documentation recommends merchant-listing structured data for purchasable product pages and business-level return-policy markup under Organization.
- Google shipping-policy documentation supports `ShippingService` nested under `Organization` with `hasShippingService`.
- Google JavaScript SEO documentation recommends pre-rendering when possible and warns about soft 404s in SPAs.
- OpenAI documents `OAI-SearchBot` as the crawler for ChatGPT search results, `GPTBot` for foundation-model training, and `ChatGPT-User` for user-triggered visits.
- Bing recommends IndexNow for faster automated URL discovery across participating search engines.

Sources:
- Google generative AI SEO guide: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google AI features guide: https://developers.google.com/search/docs/appearance/ai-features
- Google product structured data: https://developers.google.com/search/docs/appearance/structured-data/product
- Google shipping policy structured data: https://developers.google.com/search/docs/appearance/structured-data/shipping-policy
- Google noindex docs: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Google JavaScript SEO basics: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google image SEO: https://developers.google.com/search/docs/appearance/google-images
- OpenAI crawlers: https://platform.openai.com/docs/bots
- Bing IndexNow: https://www.bing.com/indexnow

## Current App Audit

Strong foundations already present:

- `package.json` runs SEO artifact generation before and after Vite build: `prebuild` writes public artifacts and `build` writes static product pages into `dist`.
- `scripts/generate-seo-artifacts.js` creates `sitemap.xml`, `robots.txt`, `google-merchant-feed.tsv`, `product-seo-index.json`, and static product HTML.
- `scripts/seo/artifacts.mjs` builds static plant pages with title, meta description, canonical, Open Graph, Twitter tags, Product JSON-LD, Breadcrumb JSON-LD, FAQ JSON-LD, visible H1, image, price, quick answer, long description, care sections, troubleshooting, and FAQs.
- `src/utils/productSeo.js` centralizes product path, canonical URL, meta title, meta description, Product schema, Breadcrumb schema, FAQ schema, care sections, and local enrichment merging.
- `src/pages/ProductPage.jsx` renders product SEO metadata and schema at runtime through `SEO`.
- `src/components/ProductCareDetails.jsx` renders visible AEO-friendly quick answers, care sections, common problems, recovery tips, and product FAQs.
- `public/robots.txt` allows Google by default and explicitly allows `OAI-SearchBot`, `GPTBot`, and `ChatGPT-User`.
- Live checks on 2026-07-04 showed `https://rosaryplanthouse.com/`, `https://www.rosaryplanthouse.com/`, `/robots.txt`, `/sitemap.xml`, and `/plant/1-sempervivum-tectorum/` return `200 OK`.
- `npm test` passed with 40/40 tests.

Critical gaps:

- There are 313 local products and 223 currently available / public by today's rule.
- All 223 available products have SEO, quick answer, long description, FAQ, schema, and related-field data.
- The current indexability rule is only `product.id && product.available !== false`.
- There is no `seoStatus`, `identityVerified`, `canonicalEntityId`, `plantEntityId`, or `isSeoIndexable(product)` field/function.
- None of the currently sitemap-eligible products has a verified publishing gate.
- The old identity review flag has been removed from product JSON; future publishing decisions must use explicit human-review fields only.
- Duplicate scientific-name groups exist, including `haworthiopsis attenuata group` x7, `crassula ovata` x6, `echeveria species` x5, and `opuntia microdasys` x5.
- `public/sitemap.xml` contains 229 URLs: 6 static pages and 223 product pages.
- Unknown app routes currently redirect to `/` instead of rendering the existing `NotFoundPage`, creating soft-404 / duplicate-home risk.
- `www` currently serves `200 OK` instead of redirecting to the canonical apex host.
- `index.html` references `/og-image.jpg`, but `public/og-image.jpg` does not exist.
- Schema and pages reference `/hero-bg.jpg` and `/placeholder-plant.jpg` patterns, but those files are not present in `public`.
- `src/components/SEO.jsx` currently turns `noindex` into `noindex,nofollow`; for unapproved product pages, `noindex,follow` is better.
- The FAQ page contains shipping, payment, replacement, COD, and dispatch facts, but there is no dedicated shipping / returns / policies page with Organization-level shipping and return schema.
- There are no true static category hub pages; `/category/:categoryName` is a filtered shop view.
- There are no dedicated care-guide pages or problem-guide pages, even though every product already stores `relatedCareGuides` and `relatedProblemGuides`.
- Product pages store related plant/care/problem fields but do not render them as strong internal links.
- There is one flat sitemap, not split product/category/guide/image sitemaps.
- Product images in the feed currently use `raw.githubusercontent.com` URLs instead of stable site-hosted optimized image URLs.
- `scripts/generate-sitemap.js` is a legacy generator that includes `/cart` and non-canonical `/plant/{id}` URLs; it is not used by `package.json` and should be retired or rewritten to avoid accidental use.
- `public/manifest.json` has `start_url: "/rosary-site-react/"`, which is wrong for the production domain root.

## Priority Summary

P0, protect trust and crawl correctness:

1. Add SEO publishing controls and shared indexability logic.
2. Apply the same indexability rule to static pages, sitemap, Merchant feed, runtime robots meta, and tests.
3. Fix canonical host, app 404 behavior, missing social/schema images, and `noindex,follow`.
4. Add a dedicated shipping / returns / policies page and Organization-level merchant schema.

P1, convert existing product data into stronger answer surfaces:

5. Upgrade product pages with quick facts, taxonomy confidence, related internal links, visible FAQ/care/problem anchors, and richer Product / Offer details.
6. Build plant entity pages to handle duplicate scientific names and separate plant knowledge from SKU/product variants.
7. Build static category hub pages.
8. Build care and problem guide pages.

P2, improve discovery and media quality:

9. Split sitemaps and add an image sitemap.
10. Move product image SEO toward site-hosted optimized images with `srcset`, WebP, dimensions, and descriptive alt/caption context.
11. Add IndexNow submission for Bing / Copilot and sitemap submission helpers.

P3, measure and iterate:

12. Add a local SEO validator script.
13. Set up Search Console / Merchant Center / Business Profile / Bing Webmaster workflows.
14. Use query data to approve more products, improve low-CTR pages, and expand guides only where search demand exists.

---

### Task 1: Shared SEO Policy and Publishing Gate

**Files:**
- Create: `src/utils/seoPolicy.js`
- Modify: `src/utils/productSeo.js`
- Test: `tests/seoPolicy.test.mjs`

**Interfaces:**
- Consumes: product objects from `src/data/products.json`, Firestore products, and local enrichment.
- Produces:
  - `SEO_STATUSES`
  - `STRICT_INDEXABLE_STATUSES`
  - `getSeoStatus(product): string`
  - `isIdentityVerified(product): boolean`
  - `isSeoIndexable(product): boolean`
  - `getProductRobots(product): string`
  - `getSeoReviewSeed(product): { seoStatus: string, identityVerified: boolean, reviewReason: string }`

- [ ] **Step 1: Add failing tests for indexability**

Create `tests/seoPolicy.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getProductRobots,
  getSeoReviewSeed,
  getSeoStatus,
  isIdentityVerified,
  isSeoIndexable,
} from '../src/utils/seoPolicy.js';

test('isSeoIndexable requires id, availability, verified identity, and approved status', () => {
  assert.equal(isSeoIndexable({
    id: '1',
    available: true,
    seoStatus: 'published',
    identityVerified: true,
  }), true);

  assert.equal(isSeoIndexable({
    id: '1',
    available: true,
    seoStatus: 'needs_review',
    identityVerified: true,
  }), false);

  assert.equal(isSeoIndexable({
    id: '1',
    available: true,
    seoStatus: 'published',
    identityVerified: false,
  }), false);

  assert.equal(isSeoIndexable({
    id: '1',
    available: false,
    seoStatus: 'published',
    identityVerified: true,
  }), false);
});

test('getSeoStatus defaults unknown products to needs_review', () => {
  assert.equal(getSeoStatus({ id: '1' }), 'needs_review');
  assert.equal(getSeoStatus({ id: '1', seoStatus: 'published' }), 'published');
  assert.equal(getSeoStatus({ id: '1', seoStatus: 'bad-value' }), 'needs_review');
});

test('isIdentityVerified accepts only explicit true', () => {
  assert.equal(isIdentityVerified({ identityVerified: true }), true);
  assert.equal(isIdentityVerified({ identityVerified: false }), false);
  assert.equal(isIdentityVerified({ identity: { verified: true } }), true);
  assert.equal(isIdentityVerified({ identity: { verified: false } }), false);
});

test('getProductRobots uses index for approved pages and noindex follow for review pages', () => {
  assert.equal(getProductRobots({
    id: '1',
    available: true,
    seoStatus: 'approved',
    identityVerified: true,
  }), 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');

  assert.equal(getProductRobots({
    id: '2',
    available: true,
    seoStatus: 'needs_review',
    identityVerified: false,
  }), 'noindex,follow');
});

test('getSeoReviewSeed defaults unreviewed products to human review', () => {
  assert.deepEqual(getSeoReviewSeed({ id: '2' }), {
    seoStatus: 'needs_review',
    identityVerified: false,
    reviewReason: 'Plant has not been reviewed for SEO publishing.',
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```powershell
npm test -- tests/seoPolicy.test.mjs
```

Expected: fail because `src/utils/seoPolicy.js` does not exist.

- [ ] **Step 3: Implement `src/utils/seoPolicy.js`**

```js
export const SEO_STATUSES = Object.freeze([
  'draft',
  'needs_review',
  'approved',
  'published',
  'noindex',
  'archived',
]);

export const STRICT_INDEXABLE_STATUSES = new Set(['approved', 'published']);

const DEFAULT_INDEX_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const DEFAULT_NOINDEX_ROBOTS = 'noindex,follow';

export function getSeoStatus(product = {}) {
  const status = String(product.seoStatus || product.seo?.status || '').trim();
  return SEO_STATUSES.includes(status) ? status : 'needs_review';
}

export function isIdentityVerified(product = {}) {
  return product.identityVerified === true || product.identity?.verified === true;
}

export function isAvailableForPublicSale(product = {}) {
  return Boolean(product?.id) && product.available !== false;
}

export function isSeoIndexable(product = {}) {
  return (
    isAvailableForPublicSale(product) &&
    isIdentityVerified(product) &&
    STRICT_INDEXABLE_STATUSES.has(getSeoStatus(product))
  );
}

export function getProductRobots(product = {}) {
  return isSeoIndexable(product) ? DEFAULT_INDEX_ROBOTS : DEFAULT_NOINDEX_ROBOTS;
}

export function getSeoReviewSeed() {
  return {
    seoStatus: 'needs_review',
    identityVerified: false,
    reviewReason: 'Plant has not been reviewed for SEO publishing.',
  };
}
```

- [ ] **Step 4: Export the policy from `productSeo.js` for existing imports**

Add near the top of `src/utils/productSeo.js`:

```js
export {
  getProductRobots,
  getSeoReviewSeed,
  getSeoStatus,
  isAvailableForPublicSale,
  isIdentityVerified,
  isSeoIndexable,
} from './seoPolicy.js';
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/utils/seoPolicy.js src/utils/productSeo.js tests/seoPolicy.test.mjs
git commit -m "feat: add shared seo publishing policy"
```

### Task 2: Seed SEO Review Fields Without Breaking the Storefront

**Files:**
- Create: `scripts/seo/seed-review-status.mjs`
- Modify: `package.json`
- Test: `tests/seoReviewSeed.test.mjs`

**Interfaces:**
- Consumes: `src/data/products.json`, `scripts/products.json`.
- Produces: a dry-run report and optional write mode that adds `seoStatus`, `identityVerified`, and `seoReviewReason`.

- [ ] **Step 1: Add failing seed tests**

Create `tests/seoReviewSeed.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { seedProductReviewStatus } from '../scripts/seo/seed-review-status.mjs';

test('seedProductReviewStatus preserves existing approved status', () => {
  const product = {
    id: '1',
    seoStatus: 'published',
    identityVerified: true,
    identity: { possibleIdentity1: 'Sempervivum tectorum - High' },
  };

  assert.deepEqual(seedProductReviewStatus(product), product);
});

test('seedProductReviewStatus adds conservative status for unreviewed rows', () => {
  const product = {
    id: '2',
    identity: { possibleIdentity1: 'Bergeranthus species - Medium' },
  };

  assert.deepEqual(seedProductReviewStatus(product), {
    id: '2',
    identity: { possibleIdentity1: 'Bergeranthus species - Medium' },
    seoStatus: 'needs_review',
    identityVerified: false,
    seoReviewReason: 'Plant has not been reviewed for SEO publishing.',
  });
});
```

- [ ] **Step 2: Implement `scripts/seo/seed-review-status.mjs`**

```js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { getSeoReviewSeed } from '../../src/utils/seoPolicy.js';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..', '..');
const targetFiles = [
  path.join(rootDir, 'src', 'data', 'products.json'),
  path.join(rootDir, 'scripts', 'products.json'),
];

export function seedProductReviewStatus(product = {}) {
  if (product.seoStatus || product.identityVerified === true || product.identityVerified === false) {
    return product;
  }

  const seed = getSeoReviewSeed(product);
  return {
    ...product,
    seoStatus: seed.seoStatus,
    identityVerified: seed.identityVerified,
    seoReviewReason: seed.reviewReason,
  };
}

function countStatuses(products) {
  return products.reduce((counts, product) => {
    const status = product.seoStatus || '(missing)';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main() {
  const write = process.argv.includes('--write');

  for (const filePath of targetFiles) {
    const products = await readJson(filePath);
    const seeded = products.map(seedProductReviewStatus);
    const relativePath = path.relative(rootDir, filePath);
    console.log(`${relativePath}:`);
    console.log(JSON.stringify(countStatuses(seeded), null, 2));

    if (write) {
      await writeJson(filePath, seeded);
    }
  }
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
```

- [ ] **Step 3: Add scripts**

Modify `package.json`:

```json
"seo:seed-review": "node scripts/seo/seed-review-status.mjs",
"seo:seed-review:write": "node scripts/seo/seed-review-status.mjs --write"
```

- [ ] **Step 4: Run dry run**

Run:

```powershell
npm run seo:seed-review
```

Expected: status counts are printed and files are unchanged.

- [ ] **Step 5: Run write mode only after confirming the counts**

Run:

```powershell
npm run seo:seed-review:write
```

Expected: products gain `seoStatus`, `identityVerified`, and `seoReviewReason`.

- [ ] **Step 6: Approve the first batch manually**

Recommended first batch:

- Top demand products with `demand: "VeryHigh"` or `demand: "High"`.
- Products with exact visible labels and high-confidence identity.
- Products with no duplicate or ambiguous scientific-name group.
- Minimum first target: 30 products.
- Better first target: 50 products.

For each approved row set:

```json
{
  "seoStatus": "published",
  "identityVerified": true
}
```

- [ ] **Step 7: Run tests**

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```powershell
git add package.json package-lock.json scripts/seo/seed-review-status.mjs tests/seoReviewSeed.test.mjs src/data/products.json scripts/products.json
git commit -m "feat: seed seo review statuses"
```

### Task 3: Apply the Gate to Static Pages, Sitemap, Merchant Feed, and Runtime Meta

**Files:**
- Modify: `scripts/seo/artifacts.mjs`
- Modify: `scripts/generate-seo-artifacts.js`
- Modify: `src/components/SEO.jsx`
- Modify: `src/pages/ProductPage.jsx`
- Modify: `src/components/ProductModal.jsx`
- Modify: `tests/seoArtifacts.test.mjs`
- Modify: `tests/productSeo.test.mjs`

**Interfaces:**
- Consumes: `isSeoIndexable(product)` and `getProductRobots(product)`.
- Produces: consistent indexing behavior across generated and runtime pages.

- [ ] **Step 1: Update artifact tests**

Add to `tests/seoArtifacts.test.mjs`:

```js
test('SEO artifacts omit unverified products from sitemap and merchant feed', () => {
  const approvedProduct = {
    ...storefrontProduct,
    id: '1',
    available: true,
    seoStatus: 'published',
    identityVerified: true,
    seo: { slug: 'approved-plant-1' },
  };

  const reviewProduct = {
    ...storefrontProduct,
    id: '2',
    available: true,
    seoStatus: 'needs_review',
    identityVerified: false,
    seo: { slug: 'review-plant-2' },
  };

  const sitemap = buildSitemapXml([approvedProduct, reviewProduct], { baseUrl: 'https://rosaryplanthouse.com' });
  assert.match(sitemap, /\/plant\/1-approved-plant\//);
  assert.doesNotMatch(sitemap, /\/plant\/2-review-plant\//);

  const feed = buildMerchantFeedTsv([approvedProduct, reviewProduct], { baseUrl: 'https://rosaryplanthouse.com' });
  assert.match(feed, /RPH-1/);
  assert.doesNotMatch(feed, /RPH-2/);
});
```

- [ ] **Step 2: Import `isSeoIndexable` into `scripts/seo/artifacts.mjs`**

Change the product public rule:

```js
import {
  isSeoIndexable,
  // existing imports
} from '../../src/utils/productSeo.js';

function productIsPublic(product) {
  return isSeoIndexable(product);
}
```

- [ ] **Step 3: Use `isSeoIndexable` in `scripts/generate-seo-artifacts.js`**

```js
import { getProductPath, isSeoIndexable } from '../src/utils/productSeo.js';

const publicProducts = products.filter(isSeoIndexable);
```

- [ ] **Step 4: Let `SEO` accept explicit robots text**

Modify `src/components/SEO.jsx`:

```js
export default function SEO({
  title,
  description,
  image,
  type = 'website',
  url,
  canonicalUrl,
  noindex = false,
  robots,
  productData,
  schemaData,
}) {
  const robotsContent = robots || (noindex
    ? 'noindex,follow'
    : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
}
```

- [ ] **Step 5: Pass product robots from product pages**

In `src/pages/ProductPage.jsx`:

```js
import { getProductRobots } from '../utils/productSeo';

<SEO
  title={getProductMetaTitle(product)}
  description={getProductMetaDescription(product) || descPlain.slice(0, 160)}
  image={imageList[0]}
  type="product"
  canonicalUrl={canonicalUrl}
  robots={getProductRobots(product)}
  productData={{ ...product, seo: { ...(product.seo || {}), canonicalUrl }, name: title, price }}
  schemaData={schemaData}
/>
```

Apply the same change in `src/components/ProductModal.jsx`.

- [ ] **Step 6: Run build artifact generation after approvals exist**

Run:

```powershell
npm run prebuild
```

Expected: sitemap and Merchant feed contain only approved / published, identity-verified products.

- [ ] **Step 7: Run tests**

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```powershell
git add scripts/seo/artifacts.mjs scripts/generate-seo-artifacts.js src/components/SEO.jsx src/pages/ProductPage.jsx src/components/ProductModal.jsx tests/seoArtifacts.test.mjs tests/productSeo.test.mjs public/sitemap.xml public/google-merchant-feed.tsv public/robots.txt public/product-seo-index.json
git commit -m "feat: enforce seo publishing gate"
```

### Task 4: Canonical Host, Canonical Pages, and Soft-404 Cleanup

**Files:**
- Modify: `vercel.json`
- Modify: `src/App.jsx`
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/pages/AboutPage.jsx`
- Modify: `src/pages/FAQPage.jsx`
- Modify: `src/pages/ContactPage.jsx`
- Modify: `src/pages/ReviewsPage.jsx`
- Modify: `src/pages/InstaReviewsPage.jsx`
- Test: `tests/siteRoutesSeo.test.mjs`

**Interfaces:**
- Consumes: current React routes and Vercel deployment behavior.
- Produces: a single canonical host and no home-page redirects for unknown paths.

- [ ] **Step 1: Change catch-all route to render `NotFoundPage`**

In `src/App.jsx`, import:

```js
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
```

Replace:

```jsx
<Route path="*" element={<Navigate to="/" replace />} />
```

with:

```jsx
<Route path="*" element={<NotFoundPage />} />
```

- [ ] **Step 2: Add canonical URLs to public static React pages**

Examples:

```jsx
<SEO
  title="Home"
  description="Buy rare succulents, cacti, and indoor plants online from Rosary Plant House, Coonoor, Nilgiris. Safe packaging, transit replacement, and shipping across India."
  canonicalUrl="https://rosaryplanthouse.com/"
  schemaData={homeSchema}
/>
```

Use:

- Home: `https://rosaryplanthouse.com/`
- About: `https://rosaryplanthouse.com/about`
- FAQ: `https://rosaryplanthouse.com/faq`
- Contact: `https://rosaryplanthouse.com/contact`
- Reviews: `https://rosaryplanthouse.com/reviews`
- Instagram reviews: `https://rosaryplanthouse.com/insta-reviews`

- [ ] **Step 3: Redirect `www` to apex in `vercel.json`**

Add before rewrites:

```json
"redirects": [
  {
    "source": "/(.*)",
    "has": [
      {
        "type": "host",
        "value": "www.rosaryplanthouse.com"
      }
    ],
    "destination": "https://rosaryplanthouse.com/$1",
    "permanent": true
  }
]
```

- [ ] **Step 4: Redirect `/index.html` to `/`**

Add a redirect:

```json
{
  "source": "/index.html",
  "destination": "/",
  "permanent": true
}
```

- [ ] **Step 5: Keep SPA rewrite for app routes**

Keep:

```json
"rewrites": [
  {
    "source": "/(.*)",
    "destination": "/index.html"
  }
]
```

Note: Vercel will still return HTTP `200` for unknown client-side routes, but the `NotFoundPage` will now emit `noindex,follow`. That is an acceptable first fix for SPA soft-404 risk.

- [ ] **Step 6: Run tests and build**

```powershell
npm test
npm run build
```

Expected:

- Tests pass.
- Build emits static product pages.
- Unknown client route renders the noindex 404 page after hydration.

- [ ] **Step 7: Deploy and verify live**

```powershell
curl.exe -I https://www.rosaryplanthouse.com/
curl.exe -I https://rosaryplanthouse.com/index.html
curl.exe -L -s https://rosaryplanthouse.com/not-a-real-page | Select-String -Pattern "noindex|404|Page Not Found"
```

Expected:

- `www` returns 301 or 308 to apex.
- `/index.html` returns 301 or 308 to `/`.
- Unknown route includes noindex after rendering, or routes to the static 404 page if later configured.

- [ ] **Step 8: Commit**

```powershell
git add vercel.json src/App.jsx src/pages/HomePage.jsx src/pages/AboutPage.jsx src/pages/FAQPage.jsx src/pages/ContactPage.jsx src/pages/ReviewsPage.jsx src/pages/InstaReviewsPage.jsx tests/siteRoutesSeo.test.mjs
git commit -m "fix: canonicalize public routes"
```

### Task 5: Dedicated Shipping, Returns, Payment, and Trust Policy Page

**Files:**
- Create: `src/utils/siteSeo.js`
- Create: `src/pages/PoliciesPage.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Footer.jsx`
- Modify: `src/components/Layout.jsx`
- Modify: `scripts/seo/artifacts.mjs`
- Test: `tests/siteSeo.test.mjs`
- Test: `tests/seoArtifacts.test.mjs`

**Interfaces:**
- Produces:
  - `/policies`
  - Organization / OnlineStore / LocalBusiness schema
  - `hasShippingService`
  - `hasMerchantReturnPolicy`
  - visible policy answers for customers and AI answer surfaces

- [ ] **Step 1: Add `src/utils/siteSeo.js`**

```js
export const SITE = Object.freeze({
  name: 'Rosary Plant House',
  url: 'https://rosaryplanthouse.com',
  logo: 'https://rosaryplanthouse.com/android-chrome-512x512.png',
  image: 'https://rosaryplanthouse.com/og-image.jpg',
  telephone: '+917904050237',
  email: 'rosaryplanthouse@gmail.com',
  address: {
    streetAddress: 'Samayapuram, Alwarpet',
    addressLocality: 'Coonoor',
    addressRegion: 'Tamil Nadu',
    postalCode: '',
    addressCountry: 'IN',
  },
  sameAs: [
    'https://instagram.com/rosary_plant_house',
    'https://facebook.com/rosaryplanthouse',
    'https://youtube.com/channel/UCUYHYgkyhoVXy5_h8a5ly6w',
  ],
});

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'OnlineStore', 'LocalBusiness'],
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
    image: SITE.image,
    telephone: SITE.telephone,
    email: SITE.email,
    address: {
      '@type': 'PostalAddress',
      ...SITE.address,
    },
    sameAs: SITE.sameAs,
    hasShippingService: {
      '@type': 'ShippingService',
      '@id': `${SITE.url}/policies#standard-shipping`,
      name: 'Standard live plant shipping in India',
      description: 'Plants are dispatched after payment on the nearest Monday or Wednesday, packed bare-root with tissue, cotton, and cocopeat as needed, and normally shipped through DTDC to major serviceable parts of India.',
      areaServed: {
        '@type': 'Country',
        name: 'India',
      },
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      '@id': `${SITE.url}/policies#transit-damage-policy`,
      name: 'Transit damage replacement policy',
      applicableCountry: 'IN',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 2,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
      description: 'Transit damage may be considered for replacement with the customer next order when reported on the delivery day or following day. High transit risk plants are not replaceable.',
    },
  };
}

export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    publisher: {
      '@id': `${SITE.url}/#organization`,
    },
  };
}
```

- [ ] **Step 2: Test schema shape**

Create `tests/siteSeo.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildOrganizationSchema, buildWebsiteSchema, SITE } from '../src/utils/siteSeo.js';

test('organization schema includes shipping and return policy details', () => {
  const schema = buildOrganizationSchema();
  assert.equal(schema.name, 'Rosary Plant House');
  assert.equal(schema.url, SITE.url);
  assert.equal(schema.hasShippingService['@type'], 'ShippingService');
  assert.match(schema.hasShippingService.description, /Monday or Wednesday/);
  assert.equal(schema.hasMerchantReturnPolicy['@type'], 'MerchantReturnPolicy');
  assert.match(schema.hasMerchantReturnPolicy.description, /Transit damage/);
});

test('website schema points to organization publisher', () => {
  const schema = buildWebsiteSchema();
  assert.equal(schema['@type'], 'WebSite');
  assert.equal(schema.publisher['@id'], 'https://rosaryplanthouse.com/#organization');
});
```

- [ ] **Step 3: Add visible `/policies` page**

Create `src/pages/PoliciesPage.jsx` with sections:

- Shipping coverage
- Dispatch schedule: nearest Monday or Wednesday after payment
- Packing method: bare-root, tissue, cotton, cocopeat depending on plant
- Courier: DTDC by default; Speed Post / Professional on request with delay risk
- Payment: GPay, PayTM, PhonePe, net banking; no COD
- Delivery charges: extra and location-dependent
- Transit damage replacement: replacement in next order if reported on delivery day or next day
- High transit risk exception
- Customer care: WhatsApp number and email
- Nursery location: Coonoor, The Nilgiris

Use:

```jsx
<SEO
  title="Shipping, Returns and Plant Delivery Policies"
  description="Shipping, dispatch, payment, and replacement policies for live plants ordered from Rosary Plant House, Coonoor."
  canonicalUrl="https://rosaryplanthouse.com/policies"
  schemaData={[buildOrganizationSchema(), buildWebsiteSchema()]}
/>
```

- [ ] **Step 4: Wire the route and links**

In `src/App.jsx`:

```js
const PoliciesPage = lazy(() => import('./pages/PoliciesPage'));
```

Add:

```jsx
<Route path="/policies" element={<PoliciesPage />} />
<Route path="/policies.html" element={<PoliciesPage />} />
```

Add footer link:

```js
{ label: 'Policies', path: '/policies' }
```

Add sidebar info link:

```js
{ path: '/policies', label: 'Policies', emoji: 'Box' }
```

- [ ] **Step 5: Add `/policies` to static paths**

In `scripts/seo/artifacts.mjs`:

```js
const staticPaths = ['/', '/about', '/contact', '/faq', '/policies', '/reviews', '/insta-reviews'];
```

- [ ] **Step 6: Run tests and build**

```powershell
npm test
npm run build
```

Expected: `/policies` appears in sitemap, schema tests pass, and build succeeds.

- [ ] **Step 7: Validate structured data**

After deploy, run:

```powershell
curl.exe -L -s https://rosaryplanthouse.com/policies | Select-String -Pattern "ShippingService|MerchantReturnPolicy|Monday|Wednesday|no COD"
```

Then test the URL in Google's Rich Results Test and URL Inspection.

- [ ] **Step 8: Commit**

```powershell
git add src/utils/siteSeo.js src/pages/PoliciesPage.jsx src/App.jsx src/components/Footer.jsx src/components/Layout.jsx scripts/seo/artifacts.mjs tests/siteSeo.test.mjs tests/seoArtifacts.test.mjs public/sitemap.xml
git commit -m "feat: add merchant policy seo page"
```

### Task 6: Product Page AEO Upgrade

**Files:**
- Modify: `src/components/ProductCareDetails.jsx`
- Modify: `src/pages/ProductPage.jsx`
- Modify: `src/components/ProductModal.jsx`
- Modify: `scripts/seo/artifacts.mjs`
- Modify: `src/utils/productSeo.js`
- Test: `tests/productSeo.test.mjs`
- Test: `tests/seoArtifacts.test.mjs`

**Interfaces:**
- Produces:
  - visible quick facts
  - plant taxonomy facts
  - product-specific question headings
  - real internal links from related fields
  - richer Product schema

- [ ] **Step 1: Add product quick fact utilities**

In `src/utils/productSeo.js`:

```js
export function buildProductQuickFacts(product = {}) {
  const care = product.careGuide || {};
  return [
    ['Scientific name', care.scientificName],
    ['Family', care.family],
    ['Genus', care.genus],
    ['Plant type', care.plantType],
    ['Difficulty', care.difficulty],
    ['Mature size', care.matureSize],
    ['Best placement', care.bestPlacement],
    ['Watering', care.watering || product.watering],
    ['Sunlight', care.sunlight || product.sunlight],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => ({ label, value }));
}
```

- [ ] **Step 2: Add related-link utility**

```js
export function buildProductRelatedLinks(product = {}) {
  const seo = product.seo || {};
  return {
    plants: (seo.relatedPlants || []).map((slug) => ({
      label: slug.replace(/-/g, ' '),
      href: `/plants/${slug}/`,
    })),
    careGuides: (seo.relatedCareGuides || []).map((slug) => ({
      label: slug.replace(/-/g, ' '),
      href: `/plant-care/${slug}/`,
    })),
    problemGuides: (seo.relatedProblemGuides || []).map((slug) => ({
      label: slug.replace(/-/g, ' '),
      href: `/plant-problems/${slug}/`,
    })),
  };
}
```

- [ ] **Step 3: Render facts near the top of product pages**

In `ProductCareDetails`, add a `QuickFacts` section before the long description:

```jsx
function QuickFacts({ product }) {
  const facts = buildProductQuickFacts(product);
  if (facts.length === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Plant quick facts</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-lg bg-[var(--bg-primary)] p-3">
            <dt className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">{fact.label}</dt>
            <dd className="mt-1 text-sm text-[var(--text-primary)]">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

- [ ] **Step 4: Render related links**

Add a `RelatedLinks` component:

```jsx
function RelatedLinks({ product }) {
  const groups = buildProductRelatedLinks(product);
  const hasLinks = groups.plants.length || groups.careGuides.length || groups.problemGuides.length;
  if (!hasLinks) return null;

  return (
    <section className="border-t border-[var(--border-color)] pt-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Related plant help</h3>
      {[
        ['Related plants', groups.plants],
        ['Care guides', groups.careGuides],
        ['Problem guides', groups.problemGuides],
      ].map(([title, links]) => links.length > 0 && (
        <div key={title} className="mb-3">
          <h4 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-2">{title}</h4>
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="text-xs rounded-full border border-[var(--border-color)] px-3 py-1 text-[var(--text-primary)] hover:border-[var(--color-forest)]">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 5: Mirror quick facts and related links in static HTML**

Modify `scripts/seo/artifacts.mjs` so `renderStaticBody` includes:

- `<section class="seo-product-quick-facts">`
- `<dl>` rows for facts
- `<section class="seo-product-related-links">`
- real links such as `<a href="/plant-care/succulent-care-guide/">` and `<a href="/plant-problems/succulent-root-rot/">`

- [ ] **Step 6: Add richer Product / Offer fields**

In `buildProductStructuredData`, add when available:

```js
description,
additionalType: product.careGuide?.plantType,
offers: {
  // existing fields
  priceValidUntil: product.priceValidUntil || undefined,
  hasMerchantReturnPolicy: {
    '@id': 'https://rosaryplanthouse.com/policies#transit-damage-policy',
  },
  shippingDetails: {
    '@type': 'OfferShippingDetails',
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'IN',
    },
  },
}
```

Only keep `shippingDetails` if it validates in Rich Results Test; otherwise rely on Organization-level shipping from Task 5.

- [ ] **Step 7: Run tests and build**

```powershell
npm test
npm run build
```

Expected: static product HTML contains quick facts and related links; schema tests pass.

- [ ] **Step 8: Commit**

```powershell
git add src/utils/productSeo.js src/components/ProductCareDetails.jsx src/pages/ProductPage.jsx src/components/ProductModal.jsx scripts/seo/artifacts.mjs tests/productSeo.test.mjs tests/seoArtifacts.test.mjs
git commit -m "feat: strengthen product answer pages"
```

### Task 7: Plant Entity Pages for Duplicate Species and Better GEO/AEO Authority

**Files:**
- Create: `src/utils/plantEntities.js`
- Create: `src/data/plantEntities.json`
- Create: `src/pages/PlantEntityPage.jsx`
- Modify: `src/App.jsx`
- Modify: `scripts/seo/artifacts.mjs`
- Modify: `scripts/generate-seo-artifacts.js`
- Test: `tests/plantEntities.test.mjs`
- Test: `tests/seoArtifacts.test.mjs`

**Interfaces:**
- Consumes: approved products and `careGuide.scientificName`.
- Produces: `/plants/{entity-slug}/` pages that explain the plant entity and list matching product variants.

- [ ] **Step 1: Group products by canonical plant entity**

Use scientific name when confident. If scientific name is broad or uncertain, use a safe group label:

- `Echeveria species`
- `Haworthiopsis attenuata group`
- `Crassula ovata`
- `Opuntia microdasys`

Add:

```js
export function getPlantEntityKey(product = {}) {
  return String(product.careGuide?.scientificName || product.careGuide?.plantName || product.title || '')
    .toLowerCase()
    .trim();
}
```

- [ ] **Step 2: Generate entity records**

Each entity:

```json
{
  "id": "crassula-ovata",
  "slug": "crassula-ovata",
  "name": "Crassula ovata",
  "commonNames": ["Jade plant"],
  "family": "Crassulaceae",
  "genus": "Crassula",
  "summary": "Crassula ovata is a hardy succulent grown for thick glossy leaves and easy propagation.",
  "productIds": ["8", "140", "147", "179", "188", "277"],
  "seoStatus": "published",
  "identityVerified": true
}
```

- [ ] **Step 3: Add route**

```jsx
<Route path="/plants/:entitySlug" element={<PlantEntityPage />} />
```

- [ ] **Step 4: Entity page content**

Visible sections:

- H1: `{entity.name} care and buying guide`
- Quick answer
- Scientific identity / common names
- Light and watering summary
- India notes
- Common problems
- Available product variants
- Related categories and care guides

Schema:

- `WebPage`
- `BreadcrumbList`
- `ItemList` for matching product variants

- [ ] **Step 5: Link product pages to entity pages**

On product pages:

```jsx
<a href={`/plants/${product.plantEntitySlug}/`}>
  Read the full {product.careGuide.scientificName} care guide
</a>
```

- [ ] **Step 6: Generate static entity pages**

Add `buildStaticEntityHtml` to `scripts/seo/artifacts.mjs` and write entity pages in `scripts/generate-seo-artifacts.js`.

- [ ] **Step 7: Add entity sitemap entries**

Include only published, verified entities.

- [ ] **Step 8: Run tests and build**

```powershell
npm test
npm run build
```

- [ ] **Step 9: Commit**

```powershell
git add src/utils/plantEntities.js src/data/plantEntities.json src/pages/PlantEntityPage.jsx src/App.jsx scripts/seo/artifacts.mjs scripts/generate-seo-artifacts.js tests/plantEntities.test.mjs tests/seoArtifacts.test.mjs
git commit -m "feat: add plant entity seo pages"
```

### Task 8: Static Category Hub Pages

**Files:**
- Create: `src/data/categoryHubs.js`
- Create: `src/pages/CategoryHubPage.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Layout.jsx`
- Modify: `scripts/seo/artifacts.mjs`
- Modify: `scripts/generate-seo-artifacts.js`
- Test: `tests/categoryHubs.test.mjs`

**Interfaces:**
- Produces category landing pages at `/plants/succulents/`, `/plants/echeveria/`, `/plants/haworthia/`, etc.

- [ ] **Step 1: Define category hubs**

Start with:

- `/plants/succulents/`
- `/plants/cactus/`
- `/plants/echeveria/`
- `/plants/haworthia/`
- `/plants/aloe/`
- `/plants/sedum/`
- `/plants/crassula/`
- `/plants/peperomia/`
- `/plants/jade/`
- `/plants/indoor-plants/`
- `/plants/hanging-plants/`

Each hub:

```js
{
  slug: 'echeveria',
  category: 'Echeveria',
  title: 'Echeveria plants for Indian balconies',
  metaDescription: 'Shop Echeveria plants from Rosary Plant House and learn light, watering, and monsoon care tips for Indian homes.',
  h1: 'Echeveria plants and care guide',
  intro: 'Echeverias are rosette succulents that need bright light, fast drainage, and careful watering during humid Indian monsoon weather.',
  faq: [
    {
      question: 'Can Echeveria grow indoors?',
      answer: 'Only in a very bright window with enough direct light.'
    }
  ]
}
```

- [ ] **Step 2: Add route**

```jsx
<Route path="/plants/:categorySlug" element={<CategoryHubPage />} />
```

If Task 7 uses `/plants/:entitySlug`, use a resolver that checks category slugs first and then entity slugs, or use `/plant-types/:categorySlug/` for categories to avoid collision.

- [ ] **Step 3: Static content requirements**

Each category page must show:

- H1
- 150-300 words of original category guidance
- best light
- watering warning
- monsoon warning
- product grid links
- related care guide links
- category FAQ

- [ ] **Step 4: Schema**

Add:

- `CollectionPage`
- `BreadcrumbList`
- `ItemList`
- `FAQPage` if FAQs are visible

- [ ] **Step 5: Navigation links**

Update sidebar category links to point to the SEO hub for public browsing. Keep the current filtered shop behavior as an optional section within the hub.

- [ ] **Step 6: Run tests and build**

```powershell
npm test
npm run build
```

- [ ] **Step 7: Commit**

```powershell
git add src/data/categoryHubs.js src/pages/CategoryHubPage.jsx src/App.jsx src/components/Layout.jsx scripts/seo/artifacts.mjs scripts/generate-seo-artifacts.js tests/categoryHubs.test.mjs
git commit -m "feat: add category seo hubs"
```

### Task 9: Care Guide and Problem Guide Pages

**Files:**
- Create: `src/data/guidePages.js`
- Create: `src/pages/GuidePage.jsx`
- Modify: `src/App.jsx`
- Modify: `scripts/seo/artifacts.mjs`
- Modify: `scripts/generate-seo-artifacts.js`
- Modify: `src/utils/productSeo.js`
- Test: `tests/guidePages.test.mjs`

**Interfaces:**
- Produces evergreen pages under:
  - `/plant-care/{slug}/`
  - `/plant-problems/{slug}/`

- [ ] **Step 1: Create first guide set**

Care guides:

- `succulent-care-guide`
- `watering-succulents`
- `monsoon-succulent-care`
- `balcony-succulent-care`
- `indoor-plant-care`
- `bright-indirect-light-plants`
- `cactus-care-india`

Problem guides:

- `succulent-root-rot`
- `succulent-leggy-growth`
- `succulent-sunburn`
- `yellow-leaves-guide`
- `succulent-leaf-drop`
- `indoor-plant-pests`

- [ ] **Step 2: Write each guide from Rosary-specific experience**

Each guide must include:

- Indian climate context
- Coonoor / Nilgiris nursery perspective where relevant
- bare-root shipping or post-delivery recovery where relevant
- clear symptoms
- clear action steps
- product/category links
- FAQ
- last reviewed date

- [ ] **Step 3: Schema**

Use:

- `Article` for guides
- `HowTo` only when the visible page has actual ordered steps
- `FAQPage` only when FAQ content is visible
- `BreadcrumbList`

- [ ] **Step 4: Wire related links**

The existing product data has `relatedCareGuides` and `relatedProblemGuides`. Make those slugs point to real routes.

- [ ] **Step 5: Generate static guide HTML**

Add `buildStaticGuideHtml`.

- [ ] **Step 6: Run tests and build**

```powershell
npm test
npm run build
```

- [ ] **Step 7: Commit**

```powershell
git add src/data/guidePages.js src/pages/GuidePage.jsx src/App.jsx scripts/seo/artifacts.mjs scripts/generate-seo-artifacts.js src/utils/productSeo.js tests/guidePages.test.mjs
git commit -m "feat: add plant care guide pages"
```

### Task 10: Image SEO, Missing Assets, and Product Media Stability

**Files:**
- Add: `public/og-image.jpg`
- Add: `public/hero-bg.jpg` or update schema references to existing `hero-plant.webp`
- Add: `public/placeholder-plant.jpg` or update fallback to existing asset
- Create: `scripts/seo/image-audit.mjs`
- Modify: `src/utils/productSeo.js`
- Modify: `src/components/ProductCard.jsx`
- Modify: `src/pages/ProductPage.jsx`
- Modify: `scripts/seo/artifacts.mjs`
- Modify: `vercel.json`
- Test: `tests/imageSeo.test.mjs`

**Interfaces:**
- Produces stable image URLs, descriptive alt text, image sitemap data, and non-broken OG/schema images.

- [ ] **Step 1: Add or correct missing global images**

Preferred:

- Generate `public/og-image.jpg` at 1200x630.
- Generate `public/hero-bg.jpg` or change schema to `https://rosaryplanthouse.com/hero-plant.webp`.
- Generate `public/placeholder-plant.jpg` or change fallback to `/hero-plant.webp`.

- [ ] **Step 2: Stop using missing default image**

In `src/components/SEO.jsx`, set:

```js
const defaultImage = '/og-image.jpg';
```

Only after `public/og-image.jpg` exists.

- [ ] **Step 3: Prefer site-hosted product image URLs**

Current feed uses `raw.githubusercontent.com`. Move toward:

```text
https://rosaryplanthouse.com/sale_plants/{id}.jpg
```

or Firebase Storage CDN if the images are managed there.

- [ ] **Step 4: Add dimensions and modern formats**

For product images:

- keep original jpg
- generate WebP derivative
- store width/height
- render `srcSet`
- add `sizes`

- [ ] **Step 5: Cache public image folders**

Add to `vercel.json` headers:

```json
{
  "source": "/sale_plants/(.*)",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "public, max-age=31536000, immutable"
    }
  ]
}
```

- [ ] **Step 6: Add image audit**

`scripts/seo/image-audit.mjs` should fail if:

- OG image missing
- schema image missing
- product primary image missing
- image URL is not absolute in feed
- alt text is empty

- [ ] **Step 7: Run tests and build**

```powershell
npm test
npm run build
```

- [ ] **Step 8: Commit**

```powershell
git add public/og-image.jpg public/hero-bg.jpg public/placeholder-plant.jpg scripts/seo/image-audit.mjs src/utils/productSeo.js src/components/ProductCard.jsx src/pages/ProductPage.jsx scripts/seo/artifacts.mjs vercel.json tests/imageSeo.test.mjs
git commit -m "feat: improve image seo assets"
```

### Task 11: Split Sitemaps, Image Sitemap, and Merchant Feed Expansion

**Files:**
- Modify: `scripts/seo/artifacts.mjs`
- Modify: `scripts/generate-seo-artifacts.js`
- Modify: `public/robots.txt`
- Test: `tests/seoArtifacts.test.mjs`

**Interfaces:**
- Produces:
  - `/sitemap.xml` as sitemap index
  - `/sitemap-pages.xml`
  - `/sitemap-products.xml`
  - `/sitemap-categories.xml`
  - `/sitemap-guides.xml`
  - `/sitemap-images.xml`

- [ ] **Step 1: Convert root sitemap to sitemap index**

`/sitemap.xml` should contain:

```xml
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://rosaryplanthouse.com/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>https://rosaryplanthouse.com/sitemap-products.xml</loc></sitemap>
  <sitemap><loc>https://rosaryplanthouse.com/sitemap-categories.xml</loc></sitemap>
  <sitemap><loc>https://rosaryplanthouse.com/sitemap-guides.xml</loc></sitemap>
  <sitemap><loc>https://rosaryplanthouse.com/sitemap-images.xml</loc></sitemap>
</sitemapindex>
```

- [ ] **Step 2: Build image sitemap**

Use Google image sitemap extension:

```xml
<url>
  <loc>https://rosaryplanthouse.com/plant/1-sempervivum-tectorum/</loc>
  <image:image>
    <image:loc>https://rosaryplanthouse.com/sale_plants/1.jpg</image:loc>
    <image:title>Sempervivum tectorum plant from Rosary Plant House</image:title>
  </image:image>
</url>
```

- [ ] **Step 3: Keep only indexable product pages in product and image sitemaps**

Use `isSeoIndexable(product)`.

- [ ] **Step 4: Expand Merchant feed**

Add fields only if accurate:

- `google_product_category`
- `product_type`
- `condition`
- `availability`
- `price`
- `brand`
- `shipping_label`

Do not add fake GTIN/MPN values.

- [ ] **Step 5: Update robots**

```txt
Sitemap: https://rosaryplanthouse.com/sitemap.xml
```

Keep the current OpenAI bot allowances.

- [ ] **Step 6: Run tests and build**

```powershell
npm test
npm run build
```

- [ ] **Step 7: Deploy and verify**

```powershell
curl.exe -L -s https://rosaryplanthouse.com/sitemap.xml | Select-String -Pattern "sitemapindex|sitemap-products|sitemap-images"
curl.exe -I https://rosaryplanthouse.com/sitemap-products.xml
curl.exe -I https://rosaryplanthouse.com/sitemap-images.xml
```

- [ ] **Step 8: Commit**

```powershell
git add scripts/seo/artifacts.mjs scripts/generate-seo-artifacts.js public/robots.txt public/sitemap.xml public/sitemap-pages.xml public/sitemap-products.xml public/sitemap-categories.xml public/sitemap-guides.xml public/sitemap-images.xml public/google-merchant-feed.tsv tests/seoArtifacts.test.mjs
git commit -m "feat: split seo sitemaps"
```

### Task 12: IndexNow and Search Submission Helpers

**Files:**
- Create: `scripts/seo/indexnow-submit.mjs`
- Create: `public/{indexnow-key}.txt`
- Modify: `package.json`
- Test: `tests/indexnowPayload.test.mjs`

**Interfaces:**
- Produces a safe submission helper for Bing / Copilot discovery.

- [ ] **Step 1: Generate an IndexNow key**

Create a unique key and publish it at:

```text
public/{key}.txt
```

File content should be exactly the key.

- [ ] **Step 2: Create payload builder**

```js
export function buildIndexNowPayload({ host, key, urls }) {
  return {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: urls,
  };
}
```

- [ ] **Step 3: Submit changed URLs after deploy**

Use:

```js
await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});
```

- [ ] **Step 4: Add package script**

```json
"seo:indexnow": "node scripts/seo/indexnow-submit.mjs"
```

- [ ] **Step 5: Run with dry-run first**

```powershell
npm run seo:indexnow -- --dry-run
```

- [ ] **Step 6: Commit**

```powershell
git add scripts/seo/indexnow-submit.mjs public/{key}.txt package.json package-lock.json tests/indexnowPayload.test.mjs
git commit -m "feat: add indexnow submission helper"
```

### Task 13: Local SEO Validation Script

**Files:**
- Create: `scripts/seo/validate-build.mjs`
- Modify: `package.json`
- Test: `tests/seoValidation.test.mjs`

**Interfaces:**
- Produces a pass/fail report for generated SEO artifacts.

- [ ] **Step 1: Validator requirements**

For every generated public page:

- exactly one `<title>`
- meta description present
- canonical present and apex-hosted
- robots present
- exactly one H1 in static SEO body where applicable
- JSON-LD parses
- Product pages have Product schema, Breadcrumb schema, and visible price
- FAQ schema exists only when visible FAQs exist
- image URLs are reachable or site-local
- no `/cart`, `/account`, `/wishlist`, `/admin`, `/orders` in public sitemap
- no unverified products in product sitemap
- no `www.rosaryplanthouse.com` canonical URLs
- no missing `/og-image.jpg`

- [ ] **Step 2: Add package script**

```json
"seo:validate": "node scripts/seo/validate-build.mjs"
```

- [ ] **Step 3: Run build and validation**

```powershell
npm run build
npm run seo:validate
```

Expected: validation passes.

- [ ] **Step 4: Commit**

```powershell
git add scripts/seo/validate-build.mjs package.json package-lock.json tests/seoValidation.test.mjs
git commit -m "test: add seo build validation"
```

### Task 14: Measurement and Operating Workflow

**Files:**
- Create: `docs/seo-operations.md`
- Create: `docs/seo-review-checklist.md`
- Optional Create: `scripts/seo/search-console-submit.mjs`

**Interfaces:**
- Produces an operating process for ranking work after technical implementation.

- [ ] **Step 1: Create `docs/seo-review-checklist.md`**

For each product before publishing:

- Verify plant identity from human expertise.
- Choose whether species, cultivar, or group-level name is safest.
- Confirm title matches visible plant.
- Confirm `seo.metaTitle` and H1 are not overpromising exact identity.
- Confirm price and availability are current.
- Confirm image shows the actual item or accurate product type.
- Confirm care content is safe for Indian conditions.
- Set `identityVerified: true`.
- Set `seoStatus: "published"`.

- [ ] **Step 2: Create `docs/seo-operations.md`**

Include weekly routine:

- Check Google Search Console Performance, Pages, Sitemaps, Product snippets, Merchant listings.
- Check Merchant Center product diagnostics.
- Check Google Business Profile completeness and recent reviews.
- Check Bing Webmaster and IndexNow response.
- Approve 10-20 more products per week.
- Improve pages with high impressions and low CTR.
- Add guide pages only when query data or customer questions justify them.

- [ ] **Step 3: Track core query clusters**

Initial query groups:

- branded: `Rosary Plant House`, `Rosary Plant House Coonoor`
- local: `plant nursery Coonoor`, `succulent nursery Nilgiris`, `buy succulents Coonoor`
- ecommerce: `buy succulents online India`, `buy cactus online India`, `rare succulents India`
- care: `monsoon succulent care India`, `succulent root rot India`, `how to water succulents India`
- product: top 30 approved product scientific names + `care`, `buy`, `plant`

- [ ] **Step 4: Add external verification steps**

Manual verification after deploy:

- Google Search Console URL Inspection for `/`, `/policies`, 5 approved products, 2 categories, 2 guides.
- Rich Results Test for product page and policies page.
- Merchant Center feed upload / fetch.
- Bing Webmaster sitemap submission.
- ChatGPT search spot checks after OpenAI crawler has time to refresh.

- [ ] **Step 5: Commit**

```powershell
git add docs/seo-operations.md docs/seo-review-checklist.md
git commit -m "docs: add seo operations workflow"
```

---

## Recommended Implementation Order

1. Task 1: shared SEO policy.
2. Task 2: seed and manually approve first 30-50 products.
3. Task 3: enforce gate in sitemap/feed/static/runtime.
4. Task 4: canonical host, public canonical URLs, and NotFound route.
5. Task 5: `/policies` page and merchant schema.
6. Task 10: fix missing image assets early because it is small and visible.
7. Task 6: product page answer upgrade.
8. Task 11: split sitemaps and image sitemap.
9. Task 8: category hubs.
10. Task 9: care/problem guide pages.
11. Task 7: entity pages for duplicate species.
12. Task 13: build validator.
13. Task 12: IndexNow.
14. Task 14: operations and measurement docs.

## Verification Commands

Local:

```powershell
npm test
npm run build
npm run seo:validate
```

Live:

```powershell
curl.exe -I https://rosaryplanthouse.com/
curl.exe -I https://www.rosaryplanthouse.com/
curl.exe -L -s https://rosaryplanthouse.com/robots.txt
curl.exe -L -s https://rosaryplanthouse.com/sitemap.xml
curl.exe -L -s https://rosaryplanthouse.com/policies | Select-String -Pattern "ShippingService|MerchantReturnPolicy"
curl.exe -L -s https://rosaryplanthouse.com/plant/1-sempervivum-tectorum/ | Select-String -Pattern "<title>|canonical|application/ld\\+json|seo-product-page"
```

External:

- Google Rich Results Test for `/policies`, one product page, one category page, and one guide page.
- Google Search Console URL Inspection for the same URLs.
- Merchant Center diagnostics after feed update.
- Bing Webmaster sitemap and IndexNow status.
- PageSpeed Insights for home, product, category, and guide pages.

## Self-Review

- Spec coverage: covers technical SEO, AI search eligibility, OpenAI SearchBot access, ecommerce merchant schema, local business trust, product identity gating, category hubs, guide pages, image SEO, sitemaps, IndexNow, and measurement.
- Placeholder scan: no `TBD` or open-ended implementation placeholders remain; optional future items are explicitly marked optional.
- Type consistency: SEO policy functions are defined once and reused by static artifact generation, runtime meta, sitemap, and feed logic.
- Risk check: the only high-risk change is enforcing the SEO gate because it can remove pages from sitemap/feed. Mitigation is to seed fields, approve the first batch manually, and enforce after approvals exist.
