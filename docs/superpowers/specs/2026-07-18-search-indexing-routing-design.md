# Search Indexing Routing Design

## Goal

Make every public page expose one canonical URL, keep legacy links working through permanent redirects, preserve intentional indexing exclusions for private pages, and return a genuine HTTP 404 for unknown URLs.

## Routing design

Vercel configuration will move from static `vercel.json` to programmatic `vercel.ts`. The programmatic configuration will retain the existing host redirect, cache headers, private-route `X-Robots-Tag` headers, and application rewrites.

At configuration time, the product catalog in `src/data/products.json` will be converted into exact permanent redirects from `/plant/{id}` to the canonical path returned by the shared product SEO path helper. This keeps redirect destinations synchronized with product slugs without a paid bulk-redirect feature or a runtime redirect function.

Legacy public `.html` routes will permanently redirect to their clean equivalents. The existing `/index.html` redirect remains. Private `.html` routes will redirect to their clean routes, where the existing `noindex, nofollow` response header continues to apply.

The integrated plant-care application will receive explicit rewrites for `/care` and `/care/*`. All other current private SPA rewrites remain.

The final catch-all rewrite to `/404.html` will be removed. Because the build already emits `dist/404.html`, an unmatched filesystem URL will use Vercel's custom 404 behavior and retain a 404 response status instead of returning the error document with HTTP 200.

## Indexing behavior

- Public canonical URLs return content directly and remain indexable.
- Legacy public URLs return permanent redirects to their canonical URLs.
- Cart, wishlist, account, order, and admin routes remain intentionally excluded with `X-Robots-Tag: noindex, nofollow`.
- Unknown URLs render the existing custom error document with HTTP 404.
- The sitemap continues to contain canonical public URLs only.

## Failure handling

Configuration generation will reject malformed catalog data, missing product IDs, duplicate legacy sources, and redirect loops during tests. A malformed configuration must fail validation before deployment rather than silently emitting ambiguous routes.

## Verification

Automated tests will verify:

- every indexable product has an exact `/plant/{id}` redirect to its canonical slug URL;
- public and private `.html` variants redirect to clean URLs;
- private clean routes retain `noindex, nofollow` headers;
- `/care` routes rewrite to the SPA entry point;
- no catch-all success rewrite remains;
- the SEO artifact build still produces the sitemap, canonical pages, and `404.html`.

After deployment, representative production requests should return `308` for legacy URLs, `200` for canonical pages, and `404` for an unknown URL. Search Console validation should be requested only after those deployed responses are confirmed.
