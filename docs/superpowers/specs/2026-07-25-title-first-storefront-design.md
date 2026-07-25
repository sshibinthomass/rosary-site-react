# Title-First Storefront Product Names

## Goal

Show each product's `title` as its primary visible name throughout the customer-facing storefront. The current Shop page cards show `commonName` because they reuse an SEO identity helper that intentionally prefers the common name.

For the products highlighted in the report, the visible names become:

- `Red tip – (1.5"-2")` → `Sempervivum tectorum – (1.5"-2")`
- `Yellow Flower – (2"-3")` → `Bergeranthus multiceps – (2"-3")`
- `Stone – (1.5"-2.5")` → `Haworthia cooperi var. truncata – (1.5"-2.5")`

## Scope

Introduce a storefront presentation helper that:

1. Prefers `product.title`.
2. Appends `product.size` when the title does not already contain it.
3. Falls back to `product.commonName`, then `product.name`, and finally `Plant` when a title is missing.

Use the helper for current customer-facing product identity in:

- Shop and category product cards
- Quick View
- Individual product page visible headings, breadcrumbs, and accessible image labels
- Customer-facing recommendation and content cards
- New cart and wishlist entries, notifications, and current checkout summaries

Limited products use the same rule, with the approved fallback when their optional `title` is empty.

## Explicit Non-Goals

- Do not change `getProductDisplayName` or any existing SEO identity helper.
- Do not change meta titles, meta descriptions, structured data, canonical URLs, generated SEO artifacts, product slugs, sitemap output, or search indexing behavior.
- Do not rewrite Firestore, Excel, or local product data during loading.
- Do not change admin screens that intentionally expose `title` and `commonName` as separate fields.
- Do not rewrite names saved in completed historical orders. Those names remain immutable order snapshots.

## Architecture and Data Flow

Add a small presentation-only utility outside `productSeo.js`. Customer-facing React components and cart/wishlist entry creation call this utility when they need a visible or persisted current product name.

The product data itself remains unchanged:

```text
Firestore/local product
        |
        +-- SEO utilities ----------> existing common-name SEO identity
        |
        +-- storefront utility -----> title-first visible identity
```

This separation prevents a storefront wording change from altering SEO output. Components continue to use existing SEO utilities for metadata, schemas, canonical URLs, and paths.

## Compatibility and Error Handling

The storefront utility accepts incomplete legacy records. Missing or blank `title` values fall back to `commonName`, then `name`, so limited products and older records remain usable. Size text is normalized and not appended twice.

Existing cart or wishlist records that contain only a stored `name` continue to render that snapshot. Newly added or re-added products persist the title-first name. No background migration or extra Firestore reads are introduced.

## Testing and Verification

Follow test-driven development:

1. Add a failing unit test for title precedence, size handling, and the approved fallback order.
2. Add focused source-level regression checks proving customer-facing surfaces use the storefront helper while SEO continues using the unchanged SEO utilities.
3. Implement the smallest production change that passes the tests.
4. Run the focused tests, full test suite, lint, and production build.
5. Open the Shop page and visually verify products `#1`, `#2`, and `#4`, plus Quick View and an individual product page.
