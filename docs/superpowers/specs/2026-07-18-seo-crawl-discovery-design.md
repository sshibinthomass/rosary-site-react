# SEO Crawl Discovery Design

## Goal

Make every public, indexable product reachable through ordinary crawlable links while preserving the existing catalogue appearance, canonical URLs, product identity copy, and purchasing flows.

## Current problem

- The server-rendered shop page exposes only 30 product links.
- Server-rendered category pages cap both visible product links and `ItemList` entries at 50.
- Product cards navigate from a clickable `div`, so the client-rendered catalogue does not expose a conventional product anchor for each card.
- Product pages link back to categories and guides, but not directly to a small set of sibling product pages.

These limits leave some sitemap products with weak internal-link discovery and make Google more dependent on sitemap crawling and JavaScript execution.

## Chosen approach

Use three complementary crawl paths:

1. Category pages list every public product assigned to that category in server-rendered HTML and matching `ItemList` schema. No product is omitted by a presentation cap.
2. Each client-rendered product card contains a real canonical product link while retaining the current card layout and controls.
3. Each public product receives up to six deterministic related-product links. Prefer products in the same public category and subcategory, exclude the current product, unavailable products, and non-indexable products, and fall back to other products in the same category. Render the links in both static product HTML and the hydrated React page.

## Boundaries

- Do not change canonical URL construction, redirects, sitemap inclusion policy, robots directives, product titles, H1s, descriptions, prices, images, or Firebase product data.
- Do not expose products that fail the existing `isSeoIndexable` policy.
- Do not add pagination or new public routes.
- Keep related links compact and text-only inside the existing related-links section.
- Avoid a new runtime Firestore catalogue query. Related-link metadata must be generated into the existing SEO product index during the artifact build.

## Data flow

The SEO artifact generator merges local SEO data with live storefront availability, filters it through the existing public-index policy, and deterministically derives related products. It writes those minimal link records into each matching product's SEO enrichment. Static product-page generation and runtime product enrichment consume the same records, keeping crawler HTML and hydrated UI aligned.

Each related record contains only a display label and canonical relative path. Selection is stable for unchanged catalogue data so builds do not shuffle internal links unnecessarily.

## Error handling

- Missing or malformed product/category data produces no related-product link rather than an invalid URL.
- Empty categories render the existing empty-state copy.
- Products without generated related links continue to show their existing category and guide links.
- Duplicate paths and self-links are removed before applying the six-link limit.

## Verification

- Unit tests prove category pages include products beyond position 50 in both HTML and `ItemList` data.
- Unit tests prove related-product selection excludes self, unavailable, and non-indexable records; prioritizes same-subcategory records; is deterministic; and respects the limit.
- Artifact tests prove static product HTML and the generated SEO index carry canonical related-product links.
- Source/component tests prove product cards expose canonical links without changing add-to-cart controls.
- Run the full unit suite, lint, production build, generated-artifact crawl checks, and production smoke tests before merging and deployment.
