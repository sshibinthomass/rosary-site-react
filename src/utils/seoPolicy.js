export const SEO_STATUSES = Object.freeze([
  'draft',
  'needs_review',
  'approved',
  'published',
  'noindex',
  'archived',
]);

export const STRICT_INDEXABLE_STATUSES = new Set(['approved', 'published']);

const INDEX_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const NOINDEX_ROBOTS = 'noindex,follow';

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
  return isSeoIndexable(product) ? INDEX_ROBOTS : NOINDEX_ROBOTS;
}

export function getSeoReviewSeed() {
  return {
    seoStatus: 'needs_review',
    identityVerified: false,
    seoReviewReason: 'Plant has not been reviewed for SEO publishing.',
  };
}
