# Product Variant SEO Identity Design

**Date:** 2026-07-18

## Goal

Preserve every genuine product page while making each indexable product's visible and machine-readable identity reflect its actual variety and sellable size.

## Problem

The storefront stores the product variety in Firebase's `commonName` field and the sellable specimen size in `size`. During SEO artifact generation, Firebase storefront fields are merged with the local enrichment record. The existing SEO helpers then prefer repeated enrichment values such as `merchant.title`, `schema.name`, and `seo.h1`, so distinct products can publish the same title, H1, description, breadcrumb name, and Product schema name.

This mismatch creates ambiguous page identity even though each product has its own URL, photograph, price, common name, and size.

## Approved Approach

Create one centralized product SEO identity helper derived from the authoritative storefront fields:

1. Use `commonName` as the variety name when present.
2. Fall back to `title`, `name`, enriched product names, and finally `Plant` only when `commonName` is absent.
3. Append the normalized `size` when present and when it is not already contained in the variety name.
4. Do not append product IDs or invent cultivar names.

Example output:

- Variety: `Zebra Haworthia`
- Size: `Large Cluster`
- SEO identity: `Zebra Haworthia – Large Cluster`

Existing product paths and canonical URLs remain unchanged. This preserves accumulated URL history while improving the content and structured signals at those URLs.

## Architecture

`src/utils/productSeo.js` will own the identity composition so the browser UI, static artifact generator, Merchant feed, breadcrumbs, image descriptions, and structured data cannot drift into separate naming rules.

The helper will consume a merged product object and return a compact display string. Existing SEO functions will use that result for:

- Product display name and visible H1
- Meta title and meta description
- Product structured-data `name` and `size`
- Breadcrumb product name
- Merchant feed title and description
- Static product image alternative text
- Product cards and related-product links where those surfaces currently consume the shared display-name helper

The long botanical care guide remains variety-oriented. A short visible specimen summary will identify the exact common name and offered size without rewriting care guidance or making unsupported botanical claims.

## Data Rules

- `commonName` and `size` remain Firebase-owned storefront fields.
- Local SEO enrichment must not duplicate or override those fields.
- Whitespace is collapsed and leading/trailing punctuation is removed from composed identity parts.
- Missing size produces the common name alone.
- Missing common name uses the existing safe fallback chain.
- A size already present in the common name is not appended twice.
- Products with different common names, sizes, or both remain independent `Product` entities.
- `ProductGroup` and `isVariantOf` are not added because the products are sold on independent pages rather than as selectable options on one parent page.

## Structured Data

Each page continues to publish one `Product` with its existing SKU, canonical URL, image, Offer, price, availability, brand, seller, and return policy.

The Product `name` will use the composed SEO identity. The schema will include `size` when the storefront provides it. No GTIN, cultivar, color, or other property will be fabricated.

## Duplicate Prevention

Automated tests will calculate the generated SEO identity, meta title, visible H1, Merchant title, and Product schema name for representative merged products. They will prove that:

- Equal botanical enrichment plus different common names produces different output.
- Equal common names plus different sizes produces different output.
- Repeated size text is not duplicated.
- Canonical URLs do not change.
- Missing storefront fields retain safe current fallbacks.

A data-quality test will reject duplicate generated identities among indexable products when merged storefront data is available during artifact generation. Local enrichment-only records are not required to be unique because the authoritative differentiators intentionally live in Firebase.

## Publishing and Verification

After implementation:

1. Run the focused product SEO and artifact tests and confirm the new tests fail before the implementation and pass afterward.
2. Run the complete unit test suite, care tests, type-check, lint, image audit, and production build.
3. Inspect generated HTML and Merchant feed rows for at least two formerly duplicated clusters.
4. Confirm canonical URLs and sitemap membership are unchanged.
5. Push `main`, deploy to Vercel production, and verify representative live titles, H1s, descriptions, breadcrumbs, image alt text, and JSON-LD.
6. Resubmit the sitemap in Search Console after production verification. Individual indexing requests are unnecessary for every product; Google can recrawl through the updated sitemap and internal links.

## Non-Goals

- Consolidating or deleting genuine products
- Renaming canonical product URLs
- Guessing botanical cultivars from photographs
- Adding selectable variant purchasing to one parent page
- Rewriting the full botanical care catalogue
- Changing prices, inventory, availability, or product IDs
