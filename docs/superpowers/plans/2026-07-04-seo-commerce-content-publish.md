# SEO Commerce Content Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the current static SEO build with richer product commerce schema, expanded content hubs, image sitemap metadata, and an `llms.txt` crawler summary.

**Architecture:** Keep SEO artifact generation centralized in `scripts/seo/artifacts.mjs`, with product-level commerce schema in `src/utils/productSeo.js` and shared policy facts in `src/utils/siteSeo.js`. Use existing Vite/Vercel build flow so `public/` and `dist/` receive the same sitemap, robots, feed, and LLM artifacts.

**Tech Stack:** React, Vite, Node test runner, schema.org JSON-LD, Google Merchant TSV feed, Vercel CLI.

## Global Constraints

- Do not add fake ratings or fake reviews.
- Shipping charge is location-dependent, so do not invent a fixed shipping price.
- Keep OpenAI crawler robots permissions for `OAI-SearchBot`, `GPTBot`, and `ChatGPT-User`.
- Preserve existing verified policy facts for shipping, refund, replacement, payment, and support.

---

### Task 1: Product Offer Schema And Merchant Feed Fallback

**Files:**
- Modify: `src/utils/productSeo.js`
- Modify: `src/utils/siteSeo.js`
- Modify: `scripts/seo/artifacts.mjs`
- Modify: `scripts/generate-seo-artifacts.js`
- Test: `tests/productSeo.test.mjs`
- Test: `tests/seoArtifacts.test.mjs`

**Interfaces:**
- Produces: `buildProductStructuredData(product, options).offers` with price, availability, seller, shipping details, and return policy when price exists.
- Produces: `parseMerchantFeedTsv(feedTsv)` and `mergeMerchantFeedStorefrontData(products, feedProducts)` for build-time price fallback.

- [ ] Write failing tests for offer schema, feed fallback, and richer feed columns.
- [ ] Implement shared policy constants and product offer schema.
- [ ] Parse existing Merchant feed rows before artifact generation and use them only for missing storefront fields.
- [ ] Run `npm test -- tests/productSeo.test.mjs tests/seoArtifacts.test.mjs`.

### Task 2: Content Hubs And Image SEO

**Files:**
- Modify: `src/utils/contentHubs.js`
- Modify: `scripts/seo/artifacts.mjs`
- Test: `tests/contentHubs.test.mjs`
- Test: `tests/seoArtifacts.test.mjs`

**Interfaces:**
- Produces: at least 14 content hubs including the requested high-intent guide slugs.
- Produces: `buildSitemapXml()` with image sitemap namespace and product image metadata.

- [ ] Write failing tests for requested hub slugs and image sitemap metadata.
- [ ] Add new content hub entries with direct answers, sections, FAQs, filters, and related links.
- [ ] Add image sitemap metadata for product URLs.
- [ ] Run `npm test -- tests/contentHubs.test.mjs tests/seoArtifacts.test.mjs`.

### Task 3: LLM Summary Artifact

**Files:**
- Modify: `scripts/seo/artifacts.mjs`
- Modify: `scripts/generate-seo-artifacts.js`
- Test: `tests/seoArtifacts.test.mjs`

**Interfaces:**
- Produces: `buildLlmsTxt(products, options)` and writes `llms.txt` to both `public/` and `dist/`.

- [ ] Write failing test for canonical LLM summary content.
- [ ] Generate `llms.txt` with public routes, policies, guides, sitemap, feed, and crawler note.
- [ ] Run `npm test -- tests/seoArtifacts.test.mjs`.

### Task 4: Build, Deploy, And Verify Live Static SEO

**Files:**
- Generated: `public/sitemap.xml`
- Generated: `public/google-merchant-feed.tsv`
- Generated: `public/llms.txt`
- Generated: `dist/**`

**Interfaces:**
- Produces: production Vercel deployment serving static HTML for `/`, `/guides`, `/faq`, `/contact`, `/policies`, product pages, sitemap, robots, Merchant feed, and `llms.txt`.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Deploy production with Vercel CLI.
- [ ] Verify live URLs for status, title/canonical/JSON-LD where applicable, sitemap, robots, feed, and `llms.txt`.
