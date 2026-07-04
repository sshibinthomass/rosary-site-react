const SITE_URL = 'https://rosaryplanthouse.com';
const SITE_NAME = 'Rosary Plant House';

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

export function getPrimaryProductImage(product = {}) {
  if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
    return product.imageUrls[0];
  }
  if (product.imageUrl) return product.imageUrl;
  if (product.id) return `/sale_plants/${product.id}.jpg`;
  return product.imageUrl || '/placeholder-plant.jpg';
}

export function getProductDisplayName(product = {}) {
  return product.title || product.name || product.commonName || product.schema?.name || 'Plant';
}

export function getProductPrice(product = {}) {
  const price = Number(product.salesPrice ?? product.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function getProductMetaTitle(product = {}) {
  return product.seo?.metaTitle || product.seo?.h1 || getProductDisplayName(product);
}

export function getProductMetaDescription(product = {}) {
  return (
    product.seo?.metaDescription ||
    product.schema?.description ||
    product.careGuide?.shortDescription ||
    `Buy ${getProductDisplayName(product)} online from Rosary Plant House. Quality plants delivered across India.`
  );
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
  const image = getPrimaryProductImage(product);
  const price = getProductPrice(product);
  const name = product.schema?.name || product.seo?.productName || getProductDisplayName(product);
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
    category: product.category,
    url,
  };

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
        '@type': 'Organization',
        name: SITE_NAME,
      },
    };
  }

  return structuredData;
}

export function buildBreadcrumbStructuredData(product = {}, { baseUrl = SITE_URL } = {}) {
  const category = product.category || 'Plants';
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
