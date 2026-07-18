import {
  SITE_NAME,
  SITE_POLICY,
  SITE_URL,
} from './sitePolicy.js';
import { isAvailableForPublicSale, isSeoIndexable } from './seoPolicy.js';
import { CATEGORIES } from '../config/constants.js';

export const DEFAULT_SEO_IMAGE_PATH = '/og-image.jpg';
export const HERO_SEO_IMAGE_PATH = '/hero-bg.jpg';
export const PLACEHOLDER_PLANT_IMAGE_PATH = '/placeholder-plant.jpg';

export {
  getProductRobots,
  getSeoReviewSeed,
  getSeoStatus,
  isAvailableForPublicSale,
  isIdentityVerified,
  isSeoIndexable,
} from './seoPolicy.js';

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((category) => [slugify(category), category]));
const CATEGORY_ALIASES = new Map([
  ['cacti', 'Cactus'],
  ['jade-plant', 'Jade'],
  ['foliage-plant', 'Indoor'],
  ['indoor-plant', 'Indoor'],
  ['trailing-vine', 'Hanging'],
]);

function matchKnownCategory(value) {
  const slug = slugify(value);
  if (!slug) return '';
  return CATEGORY_BY_SLUG.get(slug) || CATEGORY_ALIASES.get(slug) || '';
}

export function getProductPublicCategory(product = {}) {
  const candidates = [
    product.category,
    product.careGuide?.siteCategory,
    product.careGuide?.plantType,
  ];

  for (const candidate of candidates) {
    const category = matchKnownCategory(candidate);
    if (category) return category;
  }

  return product.category || 'Plants';
}

function stripProductIdFromSlug(slug, productId) {
  const cleanSlug = slugify(slug);
  const id = String(productId || '').trim().toLowerCase();
  if (!cleanSlug || !id) return cleanSlug;

  return cleanSlug
    .replace(new RegExp(`^${id}-`, 'i'), '')
    .replace(new RegExp(`-${id}$`, 'i'), '')
    .replace(/^-+|-+$/g, '');
}

export function getProductSeoSlug(product = {}) {
  const rawSlug =
    product.seo?.slug ||
    product.seoSlug ||
    product.title ||
    product.name ||
    product.commonName ||
    product.id;

  return stripProductIdFromSlug(rawSlug, product.id);
}

export function getProductPath(product = {}) {
  const id = String(product.id || '').trim();
  if (!id) return '/';

  const slug = getProductSeoSlug(product);
  return slug ? `/plant/${id}-${slug}/` : `/plant/${id}/`;
}

export function getProductCanonicalUrl(product = {}, baseUrl = SITE_URL) {
  return `${baseUrl.replace(/\/$/, '')}${getProductPath(product)}`;
}

export function extractProductIdFromParam(param) {
  if (!param) return '';

  const value = decodeURIComponent(String(param)).trim();
  const leadingId = value.match(/^([a-z]?\d+)(?:-|$)/i);
  if (leadingId) return leadingId[1];

  const trailingId = value.match(/(?:^|-)([a-z]?\d+)$/i);
  if (trailingId) return trailingId[1];

  return value.split('-')[0];
}

export function isProductInStock(product = {}) {
  return product.available !== false && (product.qtyAvailable !== 'NA' || product.inStock);
}

export function normalizePublicImagePath(value) {
  if (!value) return '';
  const imagePath = String(value).trim();
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith('public/')) return `/${imagePath.slice('public/'.length)}`;
  return imagePath;
}

export function getAbsoluteImageUrl(value, baseUrl = SITE_URL) {
  const imagePath = normalizePublicImagePath(value);
  if (!imagePath) return '';
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `${baseUrl.replace(/\/$/, '')}/${imagePath.replace(/^\//, '')}`;
}

export function getPrimaryProductImage(product = {}) {
  let imagePath = '';
  if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
    imagePath = product.imageUrls[0];
  } else if (product.imageUrl) {
    imagePath = product.imageUrl;
  } else if (product.id) {
    imagePath = `/sale_plants/${product.id}.jpg`;
  } else {
    imagePath = PLACEHOLDER_PLANT_IMAGE_PATH;
  }

  return normalizePublicImagePath(imagePath);
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeIdentityPart(value) {
  return compactText(value).replace(/^[\s–—,:;-]+|[\s–—,:;-]+$/g, '');
}

function includesIdentityPart(value, part) {
  return value.toLocaleLowerCase('en-IN').includes(part.toLocaleLowerCase('en-IN'));
}

function getProductVarietyName(product = {}) {
  return normalizeIdentityPart(
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
}

export function getProductDisplayName(product = {}) {
  const variety = getProductVarietyName(product);
  const size = normalizeIdentityPart(product.size);

  return size && !includesIdentityPart(variety, size) ? `${variety} – ${size}` : variety;
}

export function getProductVariantSummary(product = {}) {
  const variety = getProductVarietyName(product);
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

export function getProductPrice(product = {}) {
  const price = Number(product.salesPrice ?? product.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function buildMerchantReturnPolicySchema() {
  return {
    '@type': 'MerchantReturnPolicy',
    '@id': `${SITE_POLICY.url}#transit-damage-policy`,
    name: 'Transit damage replacement and refund policy',
    applicableCountry: 'IN',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 2,
    description: [
      SITE_POLICY.damageSupport.replacement,
      SITE_POLICY.damageSupport.proof,
      SITE_POLICY.damageSupport.refund,
      SITE_POLICY.damageSupport.exclusions,
    ].join(' '),
  };
}

export function getProductMetaTitle(product = {}) {
  if (isAvailableForPublicSale(product) && getProductPrice(product) !== null) {
    return `Buy ${getProductDisplayName(product)} Online`;
  }

  return product.seo?.metaTitle || product.seo?.h1 || getProductDisplayName(product);
}

export function getProductMetaDescription(product = {}) {
  const description = (
    product.seo?.metaDescription ||
    product.schema?.description ||
    product.careGuide?.shortDescription ||
    `Buy ${getProductDisplayName(product)} online from Rosary Plant House. Quality plants delivered across India.`
  );
  const identity = getProductDisplayName(product);

  if ((!product.commonName && !product.size) || includesIdentityPart(description, identity)) {
    return description;
  }

  return `${identity}: ${description}`;
}

export function getProductLongDescription(product = {}) {
  return product.careGuide?.longDescription || product.careGuide?.shortDescription || product.schema?.description || '';
}

function careItem(careGuide, label, key) {
  const value = careGuide?.[key];
  if (value === null || value === undefined || value === '') return null;
  return { label, key, value };
}

function buildCareItems(careGuide, definitions) {
  return definitions
    .map(([label, key]) => careItem(careGuide, label, key))
    .filter(Boolean);
}

const CARE_SECTION_DEFINITIONS = [
  {
    id: 'plant-profile',
    title: 'Plant profile',
    items: [
      ['Growth habit', 'growthHabit'],
      ['Mature size', 'matureSize'],
      ['Short description', 'shortDescription'],
    ],
  },
  {
    id: 'placement-light',
    title: 'Placement and light',
    items: [
      ['Sunlight', 'sunlight'],
      ['Best placement', 'bestPlacement'],
      ['Direct sun tolerance', 'directSunTolerance'],
      ['Indoor suitability', 'indoorSuitability'],
      ['Balcony suitability', 'balconySuitability'],
    ],
  },
  {
    id: 'watering-seasons',
    title: 'Watering by season',
    items: [
      ['Watering', 'watering'],
      ['Summer watering', 'summerWatering'],
      ['Monsoon watering', 'monsoonWatering'],
      ['Winter watering', 'winterWatering'],
    ],
  },
  {
    id: 'soil-climate',
    title: 'Soil, drainage and climate',
    items: [
      ['Soil', 'soil'],
      ['Pot/drainage', 'potDrainage'],
      ['Temperature', 'temperature'],
      ['Humidity', 'humidity'],
    ],
  },
  {
    id: 'maintenance-propagation',
    title: 'Maintenance and propagation',
    items: [
      ['Fertilizer', 'fertilizer'],
      ['Pruning', 'pruning'],
      ['Repotting', 'repotting'],
      ['Propagation', 'propagation'],
    ],
  },
  {
    id: 'seasonal-care',
    title: 'Seasonal care',
    items: [
      ['Summer care', 'summerCare'],
      ['Monsoon care', 'monsoonCare'],
      ['Winter care', 'winterCare'],
    ],
  },
  {
    id: 'india-notes',
    title: 'India growing notes',
    items: [
      ['South India note', 'southIndiaNote'],
      ['North India note', 'northIndiaNote'],
    ],
  },
];

const TROUBLESHOOTING_DEFINITIONS = [
  ['Yellow leaves', 'yellowLeaves'],
  ['Leaf drop', 'leafDrop'],
  ['Soft stem', 'softStem'],
  ['Wrinkled leaves', 'wrinkledLeaves'],
  ['Leggy growth', 'leggyGrowth'],
  ['Sunburn', 'sunburn'],
  ['Pests', 'pests'],
  ['Root rot', 'rootRot'],
];

function buildTroubleshootingProblems(troubleshooting = {}) {
  return TROUBLESHOOTING_DEFINITIONS.map(([label, key]) => {
    const entry = troubleshooting[key];
    if (!entry?.reason && !entry?.solution) return null;
    return {
      label,
      key,
      reason: entry.reason || '',
      solution: entry.solution || '',
    };
  }).filter(Boolean);
}

export function buildProductCareSections(product = {}) {
  const careGuide = product.careGuide || {};
  const troubleshooting = product.troubleshooting || {};
  const careSections = CARE_SECTION_DEFINITIONS.map((section) => ({
    id: section.id,
    title: section.title,
    items: buildCareItems(careGuide, section.items),
  })).filter((section) => section.items.length > 0);

  const problems = buildTroubleshootingProblems(troubleshooting);
  if (problems.length > 0) {
    careSections.push({
      id: 'common-problems',
      title: 'Common problems',
      problems,
    });
  }

  if (troubleshooting.recoveryTips) {
    careSections.push({
      id: 'recovery-tips',
      title: 'Recovery tips',
      items: [{ label: 'Recovery tips', key: 'recoveryTips', value: troubleshooting.recoveryTips }],
    });
  }

  return careSections;
}

export function mergeProductWithLocalEnrichment(product, localProduct) {
  if (!product) return localProduct || null;
  if (!localProduct) return product;

  const merged = {
    ...localProduct,
    ...product,
  };

  for (const key of ['seo', 'careGuide', 'schema', 'merchant', 'troubleshooting', 'identity']) {
    if (localProduct[key] || product[key]) {
      merged[key] = {
        ...(product[key] || {}),
        ...(localProduct[key] || {}),
      };
    }
  }

  if (Array.isArray(localProduct.faqs)) {
    merged.faqs = localProduct.faqs;
  } else if (Array.isArray(product.faqs)) {
    merged.faqs = product.faqs;
  }

  return merged;
}

export function buildProductStructuredData(product = {}, { baseUrl = SITE_URL } = {}) {
  const url = product.seo?.canonicalUrl || getProductCanonicalUrl(product, baseUrl);
  const image = getAbsoluteImageUrl(getPrimaryProductImage(product), baseUrl);
  const price = getProductPrice(product);
  const name = getProductDisplayName(product);
  const description = product.schema?.description || getProductMetaDescription(product);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: [image],
    sku: product.schema?.sku || product.merchant?.sku || `RPH-${product.id}`,
    brand: {
      '@type': 'Brand',
      name: product.schema?.brand || SITE_NAME,
    },
    category: getProductPublicCategory(product),
    url,
  };

  const size = normalizeIdentityPart(product.size);
  if (size) structuredData.size = size;

  if (price !== null) {
    structuredData.offers = {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price,
      availability: isProductInStock(product)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@id': `${baseUrl.replace(/\/$/, '')}/#organization`,
        '@type': 'Organization',
        name: SITE_NAME,
      },
      hasMerchantReturnPolicy: buildMerchantReturnPolicySchema(),
    };
  }

  return structuredData;
}

export function buildBreadcrumbStructuredData(product = {}, { baseUrl = SITE_URL } = {}) {
  const category = getProductPublicCategory(product);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${baseUrl.replace(/\/$/, '')}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: category,
        item: `${baseUrl.replace(/\/$/, '')}/category/${encodeURIComponent(category)}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: getProductDisplayName(product),
        item: getProductCanonicalUrl(product, baseUrl),
      },
    ],
  };
}

export function buildFaqStructuredData(product = {}) {
  const faqs = Array.isArray(product.faqs)
    ? product.faqs.filter((faq) => faq?.question && faq?.answer)
    : [];

  if (faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export const PRODUCT_SEO_SITE = {
  name: SITE_NAME,
  url: SITE_URL,
};
