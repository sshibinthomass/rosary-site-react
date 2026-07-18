import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  buildProductCareSections,
  buildProductStructuredData,
  DEFAULT_SEO_IMAGE_PATH,
  getAbsoluteImageUrl,
  getPrimaryProductImage,
  getProductCanonicalUrl,
  getProductDisplayName,
  getProductLongDescription,
  getProductMetaDescription,
  getProductMetaTitle,
  getProductPrice,
  getProductPublicCategory,
  getProductRobots,
  getProductVariantSummary,
  isProductInStock,
  isSeoIndexable,
  PRODUCT_SEO_SITE,
} from '../../src/utils/productSeo.js';
import {
  SITE_POLICY,
  buildCustomerFaqSections,
  buildOrganizationSchema,
  buildPolicyFaqSchema,
  buildWebsiteSchema,
} from '../../src/utils/siteSeo.js';
import {
  CONTENT_HUBS,
  GUIDES_INDEX_PATH,
  buildContentHubSchemaItems,
  getContentHubCanonicalUrl,
  getContentHubImage,
  getContentHubImageAlt,
  getContentHubPath,
  getContentHubProducts,
  getRelatedProductLinks,
  getProductRelatedSeoLinks,
  getGuidesIndexCanonicalUrl,
  getRelatedContentHubs,
} from '../../src/utils/contentHubs.js';
import { CATEGORIES } from '../../src/config/constants.js';

const DEFAULT_BASE_URL = PRODUCT_SEO_SITE.url;
const SITE_NAME = PRODUCT_SEO_SITE.name;
const INDEX_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const NOINDEX_ROBOTS = 'noindex,follow';
export const PUBLIC_STATIC_PAGE_KEYS = Object.freeze(['home', 'shop', 'faq', 'contact', 'about', 'reviews', 'insta-reviews']);

const FIREBASE_OWNED_SEO_INDEX_FIELDS = new Set([
  'available',
  'salesPrice',
  'imageUrl',
  'imageUrls',
  'size',
  'originalPrice',
  'category',
  'qtyAvailable',
  'price',
  'inStock',
  'combo',
  'demand',
  'hanging',
  'indoor',
  'isRestocked',
  'mother',
  'placeAvailable',
  'transit',
  'commonName',
  'name',
  'title',
]);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

function tsvCell(value) {
  return String(value ?? '')
    .replace(/\t/g, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(url, baseUrl) {
  return getAbsoluteImageUrl(url, baseUrl);
}

function productIsPublic(product) {
  return isSeoIndexable(product);
}

function normalizeSitemapDate(value) {
  if (!value) return '';

  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value?.toDate === 'function') {
    date = value.toDate();
  } else if (Number.isFinite(value?.seconds)) {
    date = new Date(value.seconds * 1000);
  } else {
    date = new Date(value);
  }

  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function getProductSitemapLastmod(product = {}, fallbackLastmod = '') {
  const candidates = [
    product.seo?.lastmod,
    product.seo?.lastModified,
    product.seo?.updatedAt,
    product.lastmod,
    product.lastModified,
    product.updatedAt,
    product.modifiedAt,
    fallbackLastmod,
  ];

  for (const candidate of candidates) {
    const date = normalizeSitemapDate(candidate);
    if (date) return date;
  }

  return '';
}

function productId(product) {
  return String(product?.id ?? '').trim();
}

export function hasMerchantFeedProductRows(feedTsv = '') {
  return String(feedTsv)
    .split(/\r?\n/)
    .slice(1)
    .some((line) => line.trim().length > 0);
}

function feedProductId(row = {}) {
  const linkId = String(row.link || '').match(/\/plant\/([a-z]?\d+)(?:-|\/|$)/i);
  if (linkId) return linkId[1];

  const skuId = String(row.id || '').match(/^RPH-([a-z]?\d+)(?:-|$)/i);
  return skuId ? skuId[1] : '';
}

function parseFeedPrice(value) {
  const amount = Number(String(value || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function parseMerchantFeedTsv(feedTsv = '') {
  const lines = String(feedTsv)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t').map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    const id = feedProductId(row);
    const price = parseFeedPrice(row.price);

    return {
      id,
      available: String(row.availability || '').toLowerCase() !== 'out_of_stock',
      salesPrice: price,
      imageUrl: row.image_link || '',
      category: row.product_type ? String(row.product_type).split('>').pop().trim() : undefined,
      schema: {
        sku: row.id || '',
        brand: row.brand || SITE_NAME,
      },
      merchant: {
        title: row.title || '',
        description: row.description || '',
      },
    };
  }).filter((product) => product.id && product.salesPrice !== null);
}

function mergeMerchantFeedProduct(product = {}, feedProduct = {}) {
  const merged = { ...product };

  if (getProductPrice(merged) === null && feedProduct.salesPrice !== null) {
    merged.salesPrice = feedProduct.salesPrice;
  }
  if (merged.available === undefined && feedProduct.available !== undefined) {
    merged.available = feedProduct.available;
  }
  if (!merged.imageUrl && feedProduct.imageUrl) {
    merged.imageUrl = feedProduct.imageUrl;
  }
  if (!merged.category && feedProduct.category) {
    merged.category = feedProduct.category;
  }

  merged.schema = {
    ...(feedProduct.schema || {}),
    ...(product.schema || {}),
  };
  if (!merged.schema.sku && feedProduct.schema?.sku) merged.schema.sku = feedProduct.schema.sku;
  if (!merged.schema.brand && feedProduct.schema?.brand) merged.schema.brand = feedProduct.schema.brand;

  merged.merchant = {
    ...(feedProduct.merchant || {}),
    ...(product.merchant || {}),
  };
  if (!merged.merchant.title && feedProduct.merchant?.title) merged.merchant.title = feedProduct.merchant.title;
  if (!merged.merchant.description && feedProduct.merchant?.description) {
    merged.merchant.description = feedProduct.merchant.description;
  }

  return merged;
}

export function mergeMerchantFeedStorefrontData(products = [], feedProducts = []) {
  const feedById = new Map(
    feedProducts
      .filter((product) => productId(product))
      .map((product) => [productId(product), product])
  );

  return products.map((product) => {
    const feedProduct = feedById.get(productId(product));
    return feedProduct ? mergeMerchantFeedProduct(product, feedProduct) : product;
  });
}

function mergeNestedProductData(localProduct = {}, firebaseProduct = {}) {
  const merged = {
    ...localProduct,
    ...firebaseProduct,
  };

  for (const key of ['seo', 'careGuide', 'schema', 'merchant', 'troubleshooting', 'identity']) {
    if (localProduct[key] || firebaseProduct[key]) {
      merged[key] = {
        ...(firebaseProduct[key] || {}),
        ...(localProduct[key] || {}),
      };
    }
  }

  if (Array.isArray(localProduct.faqs)) {
    merged.faqs = localProduct.faqs;
  } else if (Array.isArray(firebaseProduct.faqs)) {
    merged.faqs = firebaseProduct.faqs;
  }

  return merged;
}

export function mergeFirebaseStorefrontData(localProducts = [], firebaseProducts = []) {
  const firebaseById = new Map(
    firebaseProducts
      .filter((product) => productId(product))
      .map((product) => [productId(product), product])
  );
  const mergedIds = new Set();
  const products = localProducts.map((localProduct) => {
    const id = productId(localProduct);
    const firebaseProduct = firebaseById.get(id);
    mergedIds.add(id);
    return firebaseProduct ? mergeNestedProductData(localProduct, firebaseProduct) : localProduct;
  });

  for (const firebaseProduct of firebaseProducts) {
    const id = productId(firebaseProduct);
    if (id && !mergedIds.has(id)) {
      products.push(firebaseProduct);
    }
  }

  return products;
}

export function stripFirebaseOwnedFieldsForSeoIndex(products = []) {
  return products.map((product) => {
    const stripped = { ...product };
    for (const field of FIREBASE_OWNED_SEO_INDEX_FIELDS) {
      delete stripped[field];
    }
    return stripped;
  });
}

export function enrichSeoIndexWithRelatedProducts(seoIndexProducts = [], publicProducts = []) {
  const publicById = new Map(publicProducts.map((product) => [String(product?.id || ''), product]));

  return seoIndexProducts.map((product) => {
    const publicProduct = publicById.get(String(product?.id || ''));
    if (!publicProduct || !isSeoIndexable(publicProduct)) return { ...product };

    return {
      ...product,
      seo: {
        ...(product.seo || {}),
        relatedProducts: getRelatedProductLinks(publicProduct, publicProducts),
      },
    };
  });
}

export function buildSitemapXml(products, { baseUrl = DEFAULT_BASE_URL, lastmod = '' } = {}) {
  const publicBase = baseUrl.replace(/\/$/, '');
  const defaultLastmod = normalizeSitemapDate(lastmod);
  const staticPaths = ['/', '/shop', '/about', '/contact', '/faq', '/policies', '/reviews', '/insta-reviews', GUIDES_INDEX_PATH];
  const urls = [
    ...staticPaths.map((path) => ({
      loc: `${publicBase}${path}`,
      lastmod: defaultLastmod,
      priority: path === '/' ? '1.0' : '0.7',
      changefreq: 'weekly',
    })),
    ...CATEGORIES.map((category) => ({
      loc: `${publicBase}/category/${encodeURIComponent(category)}`,
      lastmod: defaultLastmod,
      priority: '0.75',
      changefreq: 'weekly',
    })),
    ...CONTENT_HUBS.map((hub) => ({
      loc: getContentHubCanonicalUrl(hub, publicBase),
      lastmod: defaultLastmod,
      priority: '0.72',
      changefreq: 'monthly',
      image: getAbsoluteImageUrl(getContentHubImage(hub), publicBase),
      imageTitle: getContentHubImageAlt(hub),
    })),
    ...products
      .filter(productIsPublic)
      .map((product) => ({
        loc: getProductCanonicalUrl(product, publicBase),
        lastmod: getProductSitemapLastmod(product, defaultLastmod),
        priority: '0.8',
        changefreq: 'weekly',
        image: absoluteUrl(getPrimaryProductImage(product), publicBase),
        imageTitle: `${getProductDisplayName(product)} from ${SITE_NAME}`,
      })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
${url.lastmod ? `    <lastmod>${escapeXml(url.lastmod)}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
${url.image ? `    <image:image>
      <image:loc>${escapeXml(url.image)}</image:loc>
      <image:title>${escapeXml(url.imageTitle)}</image:title>
    </image:image>` : ''}
  </url>`).join('\n')}
</urlset>
`;
}

export function buildRobotsTxt({ baseUrl = DEFAULT_BASE_URL } = {}) {
  const publicBase = baseUrl.replace(/\/$/, '');
  return `User-agent: *
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

Sitemap: ${publicBase}/sitemap.xml
`;
}

export function buildMerchantFeedTsv(products, { baseUrl = DEFAULT_BASE_URL } = {}) {
  const headers = [
    'id',
    'title',
    'description',
    'link',
    'image_link',
    'availability',
    'price',
    'brand',
    'condition',
    'product_type',
    'shipping_label',
    'return_policy_label',
  ];

  const rows = products
    .filter(productIsPublic)
    .map((product) => ({ product, price: getProductPrice(product) }))
    .filter(({ price }) => price !== null)
    .map(({ product, price }) => {
      return [
        product.schema?.sku || `RPH-${product.id}`,
        getProductDisplayName(product),
        getProductMetaDescription(product),
        getProductCanonicalUrl(product, baseUrl),
        absoluteUrl(getPrimaryProductImage(product), baseUrl),
        isProductInStock(product) ? 'in_stock' : 'out_of_stock',
        `${price.toFixed(2)} INR`,
        product.schema?.brand || SITE_NAME,
        'new',
        `Live plants > ${getProductPublicCategory(product)}`,
        'Standard live plant shipping',
        'Transit damage replacement or refund support',
      ].map(tsvCell).join('\t');
    });

  return `${headers.join('\t')}\n${rows.join('\n')}\n`;
}

export function buildLlmsTxt(products = [], { baseUrl = DEFAULT_BASE_URL } = {}) {
  const publicBase = baseUrl.replace(/\/$/, '');
  const publicProducts = products.filter(productIsPublic).slice(0, 40);

  return `# ${SITE_NAME}

Rosary Plant House is a Coonoor, Tamil Nadu nursery selling succulents, cacti, indoor plants, balcony plants and plant care guidance online.

## Canonical Public Pages

- Home: ${publicBase}/
- Shop: ${publicBase}/shop
- About: ${publicBase}/about
- Contact: ${publicBase}/contact
- FAQ: ${publicBase}/faq
- Policies: ${publicBase}${SITE_POLICY.path}
- Reviews: ${publicBase}/reviews
- Sitemap: ${publicBase}/sitemap.xml
- Merchant feed: ${publicBase}/google-merchant-feed.tsv

## Ordering, Shipping And Support

- Service area: ${SITE_POLICY.shipping.serviceArea}.
- Dispatch days: ${SITE_POLICY.shipping.dispatchDays}.
- Delivery ETA from dispatch: ${SITE_POLICY.shipping.deliveryEtaFromDispatch.map((item) => `${item.area} ${item.eta}`).join('; ')}.
- Payment: ${SITE_POLICY.payment.methods.join(', ')}. ${SITE_POLICY.payment.cod}
- Damage support: ${SITE_POLICY.damageSupport.replacement} ${SITE_POLICY.damageSupport.proof} ${SITE_POLICY.damageSupport.refund}
- Support: ${SITE_POLICY.support.whatsAppHours} on WhatsApp at ${SITE_POLICY.support.phone}.

## Care Guides

${CONTENT_HUBS.map((hub) => `- ${hub.title}: ${getContentHubCanonicalUrl(hub, publicBase)}`).join('\n')}

## Product Page Samples

${publicProducts.map((product) => `- ${getProductDisplayName(product)}: ${getProductCanonicalUrl(product, publicBase)}`).join('\n')}

## Crawler Notes

OAI-SearchBot and ChatGPT-User are allowed in robots.txt so AI search and user-requested browsing can fetch public Rosary Plant House pages. GPTBot is also allowed.
`;
}

function removeManagedHeadTags(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]+"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]+"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="robots"[^>]*>\s*/gi, '');
}

function injectStaticHtml({
  indexHtml,
  title,
  description,
  canonicalUrl,
  image,
  type = 'website',
  robots = INDEX_ROBOTS,
  schemaItems = [],
  body,
}) {
  const headTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="${escapeHtml(robots)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:type" content="${escapeHtml(type)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    ${schemaItems.length > 0 ? `<script type="application/ld+json">${JSON.stringify(schemaItems)}</script>` : ''}
`;

  const withoutManagedHead = removeManagedHeadTags(indexHtml);
  const withHead = withoutManagedHead.replace('</head>', `${headTags}</head>`);
  return withHead.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

function renderParagraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('\n');
}

function renderFaqs(product) {
  const faqs = Array.isArray(product.faqs) ? product.faqs.filter((faq) => faq.question && faq.answer) : [];
  if (faqs.length === 0) return '';

  return `<section class="seo-product-faq">
  <h2>Questions about ${escapeHtml(getProductDisplayName(product))}</h2>
  ${faqs.map((faq) => `<details>
    <summary>${escapeHtml(faq.question)}</summary>
    <p>${escapeHtml(faq.answer)}</p>
  </details>`).join('\n')}
</section>`;
}

function renderCareSection(section) {
  if (Array.isArray(section.problems) && section.problems.length > 0) {
    return `<section class="seo-product-care-section seo-product-problems">
  <h2>${escapeHtml(section.title)}</h2>
  ${section.problems.map((problem) => `<article>
    <h3>${escapeHtml(problem.label)}</h3>
    ${problem.reason ? `<p><strong>Reason:</strong> ${escapeHtml(problem.reason)}</p>` : ''}
    ${problem.solution ? `<p><strong>Solution:</strong> ${escapeHtml(problem.solution)}</p>` : ''}
  </article>`).join('\n')}
</section>`;
  }

  const items = Array.isArray(section.items) ? section.items : [];
  if (items.length === 0) return '';

  return `<section class="seo-product-care-section">
  <h2>${escapeHtml(section.title)}</h2>
  <dl>
    ${items.map((item) => `<div>
      <dt>${escapeHtml(item.label)}</dt>
      <dd>${escapeHtml(item.value)}</dd>
    </div>`).join('\n')}
  </dl>
</section>`;
}

function renderCareSections(product) {
  return buildProductCareSections(product)
    .map(renderCareSection)
    .filter(Boolean)
    .join('\n');
}

function renderRelatedLinkGroup(title, links) {
  if (!Array.isArray(links) || links.length === 0) return '';

  return `<div>
    <h3>${escapeHtml(title)}</h3>
    <ul>
      ${links.map((link) => `<li><a href="${escapeHtml(link.path)}">${escapeHtml(link.label)}</a></li>`).join('\n')}
    </ul>
  </div>`;
}

function renderRelatedSeoLinks(product) {
  const links = getProductRelatedSeoLinks(product);
  if (links.plants.length === 0 && links.careGuides.length === 0 && links.problemGuides.length === 0) return '';

  return `<section class="seo-product-related-links">
  <h2>Related plant pages and guides</h2>
  ${renderRelatedLinkGroup('Related plants', links.plants)}
  ${renderRelatedLinkGroup('Related care guides', links.careGuides)}
  ${renderRelatedLinkGroup('Related problem guides', links.problemGuides)}
</section>`;
}

function renderStaticBody(product, baseUrl) {
  const title = getProductDisplayName(product);
  const variantSummary = getProductVariantSummary(product);
  const image = absoluteUrl(getPrimaryProductImage(product), baseUrl);
  const longDescription = getProductLongDescription(product);
  const quickAnswer = product.careGuide?.quickAnswer;
  const category = getProductPublicCategory(product);
  const price = getProductPrice(product);
  const priceMarkup = price !== null
    ? `<p><strong>Price:</strong> Rs. ${price.toLocaleString('en-IN')} ${isProductInStock(product) ? 'in stock' : 'out of stock'}</p>`
    : '';

  return `<main class="seo-product-page" data-product-id="${escapeHtml(product.id)}">
  <nav aria-label="Breadcrumb">
    <a href="/">Home</a> / <a href="/category/${encodeURIComponent(category)}">${escapeHtml(category)}</a> / <span>${escapeHtml(getProductDisplayName(product))}</span>
  </nav>
  <article>
    <h1>${escapeHtml(title)}</h1>
    <p class="seo-product-variant-summary">${escapeHtml(variantSummary)}</p>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(`${getProductDisplayName(product)} from ${SITE_NAME}`)}" />
    ${priceMarkup}
    ${quickAnswer ? `<section><h2>Quick answer</h2><p>${escapeHtml(quickAnswer)}</p></section>` : ''}
    ${longDescription ? `<section><h2>Plant details and care</h2>${renderParagraphs(longDescription)}</section>` : ''}
    ${renderCareSections(product)}
    ${renderFaqs(product)}
    ${renderRelatedSeoLinks(product)}
  </article>
</main>`;
}

function renderStaticPolicyBody() {
  return `<main class="seo-policy-page">
  <article>
    <h1>Shipping, Returns and Plant Delivery Policies</h1>
    <p>Rosary Plant House ships live plants with clear dispatch, delivery, replacement, refund, payment, and support rules.</p>
    <section>
      <h2>Shipping and dispatch</h2>
      <p>${escapeHtml(SITE_POLICY.shipping.dispatchTiming)}</p>
      <p>${escapeHtml(SITE_POLICY.shipping.packaging)}</p>
      <p>${escapeHtml(SITE_POLICY.shipping.courier)}</p>
      <p><strong>Service area:</strong> ${escapeHtml(SITE_POLICY.shipping.serviceArea)}.</p>
      <p><strong>Delivery charge:</strong> ${escapeHtml(SITE_POLICY.shipping.deliveryCharge)}</p>
    </section>
    <section>
      <h2>Delivery ETA from dispatch</h2>
      <dl>
        ${SITE_POLICY.shipping.deliveryEtaFromDispatch.map((item) => `<div>
          <dt>${escapeHtml(item.area)}</dt>
          <dd>${escapeHtml(item.eta)}</dd>
        </div>`).join('\n')}
      </dl>
    </section>
    <section>
      <h2>Damage, replacement and refund</h2>
      <p>${escapeHtml(SITE_POLICY.damageSupport.replacement)}</p>
      <p>Replacement is arranged with your next order.</p>
      <p>${escapeHtml(SITE_POLICY.damageSupport.proof)}</p>
      <p>${escapeHtml(SITE_POLICY.damageSupport.refund)}</p>
      <p>${escapeHtml(SITE_POLICY.damageSupport.exclusions)}</p>
    </section>
    <section>
      <h2>Payment and support</h2>
      <p><strong>Payment methods:</strong> ${escapeHtml(SITE_POLICY.payment.methods.join(', '))}.</p>
      <p>${escapeHtml(SITE_POLICY.payment.cod)}</p>
      <p><strong>WhatsApp support:</strong> ${escapeHtml(SITE_POLICY.support.whatsAppHours)} at ${escapeHtml(SITE_POLICY.support.phone)}.</p>
    </section>
  </article>
</main>`;
}

function renderProductLinks(products, baseUrl, limit = 8) {
  return products
    .filter(productIsPublic)
    .slice(0, limit)
    .map((product) => {
      const url = getProductCanonicalUrl(product, baseUrl);
      return `<li><a href="${escapeHtml(url.replace(baseUrl, ''))}">${escapeHtml(getProductDisplayName(product))}</a></li>`;
    })
    .join('\n');
}

function renderContentHubLinks(hubs = CONTENT_HUBS, limit = 6) {
  return hubs
    .slice(0, limit)
    .map((hub) => `<li><a href="${escapeHtml(getContentHubPath(hub))}">${escapeHtml(hub.title)}</a></li>`)
    .join('\n');
}

function renderHubSections(hub) {
  return (hub.sections || [])
    .map((section) => `<section>
    <h2>${escapeHtml(section.heading)}</h2>
    ${(section.body || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}
    ${Array.isArray(section.bullets) && section.bullets.length > 0
      ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n')}</ul>`
      : ''}
  </section>`)
    .join('\n');
}

function renderHubFaqs(hub) {
  if (!Array.isArray(hub.faqs) || hub.faqs.length === 0) return '';

  return `<section>
    <h2>Common questions</h2>
    ${hub.faqs.map((faq) => `<details open>
      <summary>${escapeHtml(faq.question)}</summary>
      <p>${escapeHtml(faq.answer)}</p>
    </details>`).join('\n')}
  </section>`;
}

function renderHubProducts(products, baseUrl) {
  if (!Array.isArray(products) || products.length === 0) {
    return '<p>Browse the full plant catalogue to find currently available plants for this guide.</p>';
  }

  return `<ul>
      ${products.map((product) => {
        const url = getProductCanonicalUrl(product, baseUrl);
        return `<li><a href="${escapeHtml(url.replace(baseUrl, ''))}">${escapeHtml(getProductDisplayName(product))}</a></li>`;
      }).join('\n')}
    </ul>`;
}

function renderRelatedHubLinks(hub) {
  const relatedHubs = getRelatedContentHubs(hub);
  if (relatedHubs.length === 0) return '';

  return `<section>
    <h2>Related plant care guides</h2>
    <ul>${renderContentHubLinks(relatedHubs, relatedHubs.length)}</ul>
  </section>`;
}

function buildGuidesIndexSchemaItems(baseUrl) {
  const publicBase = baseUrl.replace(/\/$/, '');
  const canonicalUrl = getGuidesIndexCanonicalUrl(publicBase);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Plant Care Guides',
      description: 'Plant care guides for succulents, cactus, balcony plants, monsoon care and root rot recovery from Rosary Plant House.',
      url: canonicalUrl,
      image: getAbsoluteImageUrl(getContentHubImage(CONTENT_HUBS[0]), publicBase),
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Rosary Plant House plant care guides',
      itemListElement: CONTENT_HUBS.map((hub, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: hub.title,
        url: getContentHubCanonicalUrl(hub, publicBase),
        image: getAbsoluteImageUrl(getContentHubImage(hub), publicBase),
      })),
    },
  ];
}

function buildReviewSchema(reviews = []) {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;
  const ratedReviews = reviews.filter((review) => Number.isFinite(Number(review.rating)));
  const averageRating = ratedReviews.length
    ? ratedReviews.reduce((total, review) => total + Number(review.rating), 0) / ratedReviews.length
    : 5;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Rosary Plant House Shopping Experience',
    image: `${DEFAULT_BASE_URL}${DEFAULT_SEO_IMAGE_PATH}`,
    description: 'Customer reviews and feedback for Rosary Plant House, Coonoor.',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: averageRating.toFixed(1),
      reviewCount: reviews.length,
    },
    review: reviews.slice(0, 20).map((review) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.author || 'Rosary Plant House customer',
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Number(review.rating) || 5,
        bestRating: '5',
      },
      reviewBody: review.text || '',
    })),
  };
}

function renderFaqSections() {
  return buildCustomerFaqSections()
    .map((section) => `<section>
  <h2>${escapeHtml(section.category)}</h2>
  ${section.items.map((item) => `<details open>
    <summary>${escapeHtml(item.q)}</summary>
    <p>${escapeHtml(item.a)}</p>
  </details>`).join('\n')}
</section>`)
    .join('\n');
}

function renderReviews(reviews = []) {
  const visibleReviews = Array.isArray(reviews) ? reviews.slice(0, 8) : [];
  if (visibleReviews.length === 0) {
    return '<p>Customers regularly mention healthy plants and careful packing from Rosary Plant House.</p>';
  }

  return `<ul>
  ${visibleReviews.map((review) => `<li>
    <strong>${escapeHtml(review.author || 'Customer')}</strong>
    <span>${escapeHtml(`${Number(review.rating) || 5}/5`)}</span>
    <p>${escapeHtml(review.text || '')}</p>
  </li>`).join('\n')}
</ul>`;
}

function getPublicPageConfig(page, { baseUrl, products = [], reviews = [] }) {
  const image = getAbsoluteImageUrl(DEFAULT_SEO_IMAGE_PATH, baseUrl);
  const commonSchema = [buildOrganizationSchema(), buildWebsiteSchema()];

  const configs = {
    home: {
      path: '/',
      title: `Buy Succulents, Cacti and Indoor Plants Online | ${SITE_NAME}`,
      description: 'Buy rare succulents, cacti, and indoor plants online from Rosary Plant House, Coonoor. Safe packing, clear support, and India shipping.',
      body: `<main class="seo-home-page">
  <h1>Buy succulents, cacti and indoor plants online from Coonoor</h1>
  <img src="/home/hero-natural-nursery-1200.webp" alt="Rosary Plant House natural nursery collection" width="1200" height="600" />
  <p>Rosary Plant House grows and ships rare succulents, cacti, foliage plants, and balcony plants from Coonoor, The Nilgiris.</p>
  <p><a href="/shop"><img src="/home/browse-every-plant-natural-900.webp" alt="Browse all plants at Rosary Plant House" width="900" height="507" />Shop all plants</a> or start with categories, care guides, reviews and support details.</p>
  <section>
    <h2>Popular plant categories</h2>
    <ul>${CATEGORIES.slice(0, 10).map((category) => `<li><a href="/category/${encodeURIComponent(category)}">${escapeHtml(category)} plants</a></li>`).join('')}</ul>
  </section>
  <section>
    <h2>Plant care guides</h2>
    <ul>${renderContentHubLinks()}</ul>
  </section>
  <section>
    <h2>Featured plant pages</h2>
    <ul>${renderProductLinks(products, baseUrl)}</ul>
  </section>
  <section>
    <h2>Shipping and support</h2>
    <p>${escapeHtml(SITE_POLICY.shipping.serviceArea)}. ${escapeHtml(SITE_POLICY.support.whatsAppHours)}.</p>
  </section>
</main>`,
      schemaItems: commonSchema,
      image: getAbsoluteImageUrl('/home/hero-natural-nursery.jpg', baseUrl),
    },
    shop: {
      path: '/shop',
      title: `Shop Succulents, Cacti and Indoor Plants | ${SITE_NAME}`,
      description: 'Shop succulents, cacti, indoor plants and balcony plants from Rosary Plant House, Coonoor, with category links, care support and safe packing details.',
      body: `<main class="seo-shop-page">
  <h1>Shop succulents, cacti and indoor plants</h1>
  <p>Browse the Rosary Plant House plant catalogue by category, then open product pages for plant identity, price, care and availability.</p>
  <section>
    <h2>Shop by plant category</h2>
    <ul>${CATEGORIES.map((category) => `<li><a href="/category/${encodeURIComponent(category)}">${escapeHtml(category)} plants</a></li>`).join('')}</ul>
  </section>
  <section>
    <h2>Available plant pages</h2>
    <ul>${renderProductLinks(products, baseUrl, 30)}</ul>
  </section>
  <section>
    <h2>Care before buying</h2>
    <ul>${renderContentHubLinks(CONTENT_HUBS, 6)}</ul>
  </section>
  <section>
    <h2>Shopping support</h2>
    <p>${escapeHtml(SITE_POLICY.shipping.serviceArea)}. ${escapeHtml(SITE_POLICY.support.whatsAppHours)} on WhatsApp.</p>
  </section>
</main>`,
      schemaItems: [
        ...commonSchema,
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Shop Succulents, Cacti and Indoor Plants',
          description: 'Rosary Plant House plant catalogue with succulents, cactus plants, indoor plants and balcony plants.',
          url: `${baseUrl}/shop`,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Rosary Plant House plant catalogue',
          itemListElement: products
            .filter(productIsPublic)
            .slice(0, 50)
            .map((product, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: getProductDisplayName(product),
              url: getProductCanonicalUrl(product, baseUrl),
            })),
        },
      ],
      image,
    },
    faq: {
      path: '/faq',
      title: `Help & FAQ | ${SITE_NAME}`,
      description: 'Answers about ordering, delivery, payment, replacement, refund, and plant care support from Rosary Plant House.',
      body: `<main class="seo-faq-page">
  <h1>Help & FAQ</h1>
  <p>Common answers about ordering, shipping, payment, care, and support from Rosary Plant House.</p>
  ${renderFaqSections()}
</main>`,
      schemaItems: [buildPolicyFaqSchema()],
      image,
    },
    contact: {
      path: '/contact',
      title: `Contact ${SITE_NAME} | ${SITE_NAME}`,
      description: 'Contact Rosary Plant House on WhatsApp, Instagram, email, or visit the nursery in Coonoor, The Nilgiris.',
      body: `<main class="seo-contact-page">
  <h1>Contact Rosary Plant House</h1>
  <p>WhatsApp support: ${escapeHtml(SITE_POLICY.support.whatsAppHours)}.</p>
  <p>Phone: <a href="${escapeHtml(SITE_POLICY.support.whatsAppUrl)}">${escapeHtml(SITE_POLICY.support.phone)}</a></p>
  <p>Email: <a href="mailto:${escapeHtml(SITE_POLICY.support.email)}">${escapeHtml(SITE_POLICY.support.email)}</a></p>
  <p>Nursery: Samayapuram, Alwarpet, Coonoor, The Nilgiris, Tamil Nadu.</p>
</main>`,
      schemaItems: [buildOrganizationSchema()],
      image,
    },
    about: {
      path: '/about',
      title: `About ${SITE_NAME} | ${SITE_NAME}`,
      description: 'Learn about Rosary Plant House, a Coonoor nursery in The Nilgiris offering succulents, cacti, and indoor plants online.',
      body: `<main class="seo-about-page">
  <h1>About Rosary Plant House</h1>
  <p>Rosary Plant House is a nursery in Coonoor, The Nilgiris, focused on succulents, cacti, indoor plants, and practical plant care guidance.</p>
  <section>
    <h2>Our roots</h2>
    <p>We help plant lovers choose healthy plants, understand care needs, and receive safely packed live plants.</p>
  </section>
  <section>
    <h2>Coonoor nursery location</h2>
    <p>Rosary Plant House is located at Samayapuram, Alwarpet, Coonoor, The Nilgiris, Tamil Nadu.</p>
  </section>
</main>`,
      schemaItems: commonSchema,
      image,
    },
    reviews: {
      path: '/reviews',
      title: `Customer Reviews | ${SITE_NAME}`,
      description: 'Read customer reviews for Rosary Plant House, including feedback about healthy plants, careful packing, and delivery support.',
      body: `<main class="seo-reviews-page">
  <h1>Customer Reviews</h1>
  <p>Plant lovers often mention healthy plants and careful packing from Rosary Plant House.</p>
  ${renderReviews(reviews)}
</main>`,
      schemaItems: [buildReviewSchema(reviews)].filter(Boolean),
      image,
    },
    'insta-reviews': {
      path: '/insta-reviews',
      title: `Customer Stories | ${SITE_NAME}`,
      description: 'Watch Instagram story reviews and customer plant delivery feedback for Rosary Plant House.',
      body: `<main class="seo-insta-reviews-page">
  <h1>Customer Stories</h1>
  <p>Browse Instagram story reviews from customers who received Rosary Plant House plants.</p>
  <p>Instagram story reviews show real delivery and packing feedback from plant buyers.</p>
</main>`,
      schemaItems: commonSchema,
      image,
    },
  };

  return configs[page] || null;
}

export function buildStaticPublicPageHtml({
  indexHtml,
  page,
  baseUrl = DEFAULT_BASE_URL,
  products = [],
  reviews = [],
}) {
  const publicBase = baseUrl.replace(/\/$/, '');
  const config = getPublicPageConfig(page, { baseUrl: publicBase, products, reviews });
  if (!config) {
    throw new Error(`Unknown static public page: ${page}`);
  }

  const canonicalUrl = `${publicBase}${config.path}`;
  return injectStaticHtml({
    indexHtml,
    title: config.title,
    description: config.description,
    canonicalUrl,
    image: config.image,
    schemaItems: config.schemaItems,
    body: config.body,
  });
}

const TOP_CATEGORY_SEO_CONTENT = Object.freeze({
  Succulent: {
    metaDescription: 'Shop beginner-friendly succulents from Rosary Plant House, with care guidance for bright light, fast-draining soil, safe packing and plant delivery support.',
    intro: [
      'Succulent plants are a strong choice for Indian balconies, bright windows and low-water plant collections. Start with beginner-friendly succulents that can handle dry gaps, bright light and simple after-delivery care.',
      'Rosary Plant House lists live succulent plants with product pages, price, availability, care details and packing support so you can choose plants that suit your space before ordering online.',
    ],
    buyingTitle: 'How to choose succulent plants',
    buying: [
      'Choose compact plants with clear names, current availability and a care note that matches your light conditions. Haworthia, Sedum, Crassula, Jade, Aloe and many Echeveria types are practical choices for beginners.',
      'If you are buying succulents online for the first time, pick plants that prefer low to moderate watering and avoid placing new arrivals in harsh afternoon sun immediately after delivery.',
    ],
    careTitle: 'Succulent care basics',
    care: [
      'Give most succulents bright light, fast-draining soil and a pot with drainage holes. Water deeply, then wait until the mix dries before watering again.',
      'During monsoon or humid weather, keep succulents under cover, increase airflow and reduce watering so the roots do not stay wet for too long.',
    ],
    guides: [
      { path: '/guides/succulents-in-india', label: 'Succulents in India care guide' },
      { path: '/guides/buy-succulents-online-india', label: 'Buying succulents online in India' },
      { path: '/guides/root-rot-succulent-care', label: 'Root rot prevention and recovery' },
    ],
    faqs: [
      {
        question: 'Which succulents are best for beginners?',
        answer: 'Haworthia, Sedum, Jade, Crassula, Aloe and many compact Echeveria plants are good beginner choices when they get bright light, drainage and careful watering.',
      },
      {
        question: 'Do succulents need daily watering?',
        answer: 'No. Most succulents prefer one full watering followed by a dry gap. Water only after the potting mix dries.',
      },
      {
        question: 'Can succulents grow indoors?',
        answer: 'Yes, if they are close to a bright window or balcony door. Dark shelves and rooms without window light are not suitable long term.',
      },
    ],
  },
  Cactus: {
    metaDescription: 'Shop cactus plants for bright balconies and sunny windows, with gritty soil, low-water care guidance, safe packing and Rosary Plant House support.',
    intro: [
      'Cactus plants suit bright balconies and sunny windows because they store water and prefer stronger light than most indoor foliage plants.',
      'Use this category to compare available cactus plants, check product pages and choose compact plants that can handle simple low-water care after delivery.',
    ],
    buyingTitle: 'How to choose cactus plants',
    buying: [
      'Look for clear product photos, current price, availability and notes about light needs. Compact cactus plants are easier to place on windowsills, balcony shelves and small sunny corners.',
      'For online orders, choose plants that can travel safely and give them a short recovery period in bright shade before moving them into stronger sun.',
    ],
    careTitle: 'Cactus care basics',
    care: [
      'Use a gritty cactus mix, a pot with drainage holes and deep but infrequent watering. The soil should dry fully before the next watering.',
      'Protect cactus plants from repeated monsoon rain and avoid dark indoor corners where growth becomes weak and the pot dries slowly.',
    ],
    guides: [
      { path: '/guides/cactus-care-india', label: 'Cactus care in India' },
      { path: '/guides/cactus-plants-online-india', label: 'Buying cactus plants online' },
      { path: '/guides/low-water-balcony-plants', label: 'Low water balcony plant guide' },
    ],
    faqs: [
      {
        question: 'How often should cactus plants be watered?',
        answer: 'Water after the soil dries fully. The gap changes by season, light and pot size, but daily watering is not suitable.',
      },
      {
        question: 'Can cactus plants grow indoors?',
        answer: 'They can grow near a very bright sunny window, but most cactus plants do better in strong balcony or windowsill light than in dark rooms.',
      },
      {
        question: 'Why is my cactus becoming soft?',
        answer: 'A soft cactus often means excess moisture or rot. Stop watering, check drainage and move it to a brighter, airier spot.',
      },
    ],
  },
  Echeveria: {
    metaDescription: 'Shop Echeveria rosette succulents online with bright-light care guidance, safe packing, delivery support and beginner buying tips.',
    intro: [
      'Echeveria plants are rosette succulents loved for compact shapes, layered leaves and balcony-friendly displays. They need stronger light than many indoor succulents, so placement matters.',
      'This category groups available Echeveria plant pages so shoppers can compare shapes, availability, care notes and related succulent guidance before ordering.',
    ],
    buyingTitle: 'How to choose Echeveria plants',
    buying: [
      'Choose Echeveria when you have a bright window, covered balcony or spot with good morning sun. Compact, firm rosettes are easier for beginners than stretched or weak plants.',
      'After delivery, let the plant recover in bright shade first, then increase light gradually so the rosette stays compact without scorching.',
    ],
    careTitle: 'Echeveria care basics',
    care: [
      'Give Echeveria bright light, a quick-draining succulent mix and careful watering only after the potting mix dries.',
      'Keep airflow good during humid weather, remove dead lower leaves and protect them from long rain spells to reduce rot risk.',
    ],
    guides: [
      { path: '/guides/buy-succulents-online-india', label: 'Buying succulents online in India' },
      { path: '/guides/succulents-in-india', label: 'Succulent care guide for India' },
      { path: '/guides/monsoon-succulent-care', label: 'Monsoon succulent care' },
    ],
    faqs: [
      {
        question: 'Do Echeveria plants need direct sun?',
        answer: 'They need bright light and often enjoy gentle morning sun, but newly delivered plants should be introduced to stronger light gradually.',
      },
      {
        question: 'Why is my Echeveria stretching?',
        answer: 'Stretching usually means the plant needs more light. Move it closer to a bright window or covered balcony gradually.',
      },
      {
        question: 'How do I water Echeveria?',
        answer: 'Water the soil thoroughly, avoid leaving water in the rosette, and wait until the mix dries before watering again.',
      },
    ],
  },
  Haworthia: {
    metaDescription: 'Shop Haworthia plants online for bright filtered light, low-water indoor care, safe packing and Rosary Plant House delivery support.',
    intro: [
      'Haworthia plants are compact succulents that suit bright filtered light, windowsills and covered balconies better than harsh open sun.',
      'They are useful for shoppers who want small, low-water plants with attractive leaf patterns and a gentler light requirement than many rosette succulents.',
    ],
    buyingTitle: 'How to choose Haworthia plants',
    buying: [
      'Choose Haworthia for bright shade, morning light or filtered balcony light. They are a good fit when you want a small succulent but cannot provide all-day direct sun.',
      'Check each product page for availability, plant size and care notes, then keep new plants in a stable bright spot after delivery.',
    ],
    careTitle: 'Haworthia care basics',
    care: [
      'Keep Haworthia in bright filtered light, use a fast-draining mix and water only after the potting mix has dried.',
      'For healthier leaves, avoid harsh afternoon sun, closed humid corners and decorative pots without drainage because Haworthia roots dislike staying wet.',
    ],
    guides: [
      { path: '/guides/indoor-succulent-care', label: 'Indoor succulent care' },
      { path: '/guides/succulents-in-india', label: 'Succulents in India care guide' },
      { path: '/guides/root-rot-succulent-care', label: 'Root rot prevention and recovery' },
    ],
    faqs: [
      {
        question: 'Can Haworthia grow indoors?',
        answer: 'Yes, Haworthia can grow indoors near a bright window. Dark rooms are not suitable for long-term healthy growth.',
      },
      {
        question: 'Does Haworthia need direct sunlight?',
        answer: 'Haworthia prefers bright filtered light or gentle morning sun. Harsh afternoon sun can stress or mark the leaves.',
      },
      {
        question: 'How often should Haworthia be watered?',
        answer: 'Water after the mix dries. Indoor Haworthia usually dries slower than balcony plants, so avoid fixed daily watering.',
      },
    ],
  },
});

function getCategorySeoContent(category) {
  const exactKey = Object.keys(TOP_CATEGORY_SEO_CONTENT)
    .find((key) => key.toLowerCase() === String(category || '').toLowerCase());

  if (exactKey) return TOP_CATEGORY_SEO_CONTENT[exactKey];

  return {
    metaDescription: `Shop ${category} plants from Rosary Plant House, Coonoor, with plant-specific care guidance, safe packing, and WhatsApp support.`,
    intro: [
      `Browse ${category} plants from Rosary Plant House with crawlable plant pages, care details, safe packing and support from Coonoor.`,
      `Use the product links below to compare current ${category} availability, plant names, prices and care notes before ordering online.`,
    ],
    buyingTitle: `How to choose ${category} plants`,
    buying: [
      'Check each plant page for current availability, plant identity, size, price and care notes before adding it to your order.',
      'Choose plants that match your light conditions and watering routine so they can settle well after delivery.',
    ],
    careTitle: `${category} care basics`,
    care: [
      'Give new plants a calm recovery period after delivery, then place them according to the light and watering guidance on the product page.',
      'Use a pot with drainage and avoid overwatering, especially during humid or rainy weather.',
    ],
    guides: [
      { path: '/guides', label: 'Plant care guide library' },
      { path: '/guides/buy-succulents-online-india', label: 'Buying plants online guide' },
    ],
    faqs: [
      {
        question: `How do I choose ${category} plants online?`,
        answer: 'Start with plant pages that show the name, price, availability, photo and care notes, then choose plants that match your light and watering conditions.',
      },
      {
        question: `Are ${category} plants delivered with care guidance?`,
        answer: 'Rosary Plant House product pages include care details, and the site also provides guides for plant delivery, watering, light and seasonal care.',
      },
    ],
  };
}

function renderCategoryText(paragraphs = []) {
  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('\n');
}

function renderCategoryGuideLinks(links = []) {
  if (!Array.isArray(links) || links.length === 0) return '';

  return `<section class="seo-category-guides">
    <h2>Related care and buying guides</h2>
    <ul>
      ${links.map((link) => `<li><a href="${escapeHtml(link.path)}">${escapeHtml(link.label)}</a></li>`).join('\n')}
    </ul>
  </section>`;
}

function renderCategoryFaqs(category, faqs = []) {
  if (!Array.isArray(faqs) || faqs.length === 0) return '';

  return `<section class="seo-category-faqs">
    <h2>Frequently asked questions about ${escapeHtml(category)} plants</h2>
    ${faqs.map((faq) => `<details open>
      <summary>${escapeHtml(faq.question)}</summary>
      <p>${escapeHtml(faq.answer)}</p>
    </details>`).join('\n')}
  </section>`;
}

function buildCategoryFaqSchema(faqs = []) {
  const validFaqs = faqs.filter((faq) => faq?.question && faq?.answer);
  if (validFaqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: validFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

function buildCategoryBreadcrumbSchema(category, publicBase) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${publicBase}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: category,
        item: `${publicBase}/category/${encodeURIComponent(category)}`,
      },
    ],
  };
}

export function buildStaticCategoryHtml({
  indexHtml,
  category,
  products = [],
  baseUrl = DEFAULT_BASE_URL,
}) {
  const publicBase = baseUrl.replace(/\/$/, '');
  const categoryProducts = products
    .filter(productIsPublic)
    .filter((product) => String(getProductPublicCategory(product)).toLowerCase() === String(category || '').toLowerCase());
  const canonicalPath = `/category/${encodeURIComponent(category)}`;
  const canonicalUrl = `${publicBase}${canonicalPath}`;
  const image = getAbsoluteImageUrl(DEFAULT_SEO_IMAGE_PATH, publicBase);
  const title = `Buy ${category} Plants Online | ${SITE_NAME}`;
  const categoryContent = getCategorySeoContent(category);
  const description = categoryContent.metaDescription;
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: categoryProducts.slice(0, 50).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: getProductDisplayName(product),
      url: getProductCanonicalUrl(product, publicBase),
    })),
  };
  const faqSchema = buildCategoryFaqSchema(categoryContent.faqs);
  const breadcrumbSchema = buildCategoryBreadcrumbSchema(category, publicBase);
  const schemaItems = [itemList, faqSchema, breadcrumbSchema].filter(Boolean);
  const productLinks = categoryProducts.slice(0, 50)
    .map((product) => `<li><a href="${escapeHtml(getProductCanonicalUrl(product, publicBase).replace(publicBase, ''))}">${escapeHtml(getProductDisplayName(product))}</a></li>`)
    .join('\n');
  const body = `<main class="seo-category-page">
  <nav aria-label="Breadcrumb">
    <a href="/">Home</a> / <span>${escapeHtml(category)}</span>
  </nav>
  <h1>Buy ${escapeHtml(category)} plants online</h1>
  <section class="seo-category-intro">
    ${renderCategoryText(categoryContent.intro)}
  </section>
  <section class="seo-category-buying-guide">
    <h2>${escapeHtml(categoryContent.buyingTitle)}</h2>
    ${renderCategoryText(categoryContent.buying)}
  </section>
  <section class="seo-category-care-guide">
    <h2>${escapeHtml(categoryContent.careTitle)}</h2>
    ${renderCategoryText(categoryContent.care)}
  </section>
  <section class="seo-category-products">
    <h2>Popular ${escapeHtml(category)} plant pages</h2>
    <ul>
      ${productLinks || '<li>New plants are added as availability changes.</li>'}
    </ul>
  </section>
  ${renderCategoryGuideLinks(categoryContent.guides)}
  ${renderCategoryFaqs(category, categoryContent.faqs)}
</main>`;

  return injectStaticHtml({
    indexHtml,
    title,
    description,
    canonicalUrl,
    image,
    schemaItems,
    body,
  });
}

export function buildStaticGuidesIndexHtml({
  indexHtml,
  baseUrl = DEFAULT_BASE_URL,
}) {
  const publicBase = baseUrl.replace(/\/$/, '');
  const canonicalUrl = getGuidesIndexCanonicalUrl(publicBase);
  const image = getAbsoluteImageUrl(getContentHubImage(CONTENT_HUBS[0]), publicBase);
  const body = `<main class="seo-guides-index-page">
  <h1>Plant Care Guides</h1>
  <p>Browse Rosary Plant House guides for succulent care, cactus care, low water balcony plants, monsoon protection and root rot recovery.</p>
  <section>
    <h2>Care guide library</h2>
    <ul>
      ${CONTENT_HUBS.map((hub) => `<li>
        <img src="${escapeHtml(getContentHubImage(hub))}" alt="${escapeHtml(getContentHubImageAlt(hub))}" loading="lazy" />
        <a href="${escapeHtml(getContentHubPath(hub))}">${escapeHtml(hub.title)}</a>
        <p>${escapeHtml(hub.metaDescription)}</p>
      </li>`).join('\n')}
    </ul>
  </section>
</main>`;

  return injectStaticHtml({
    indexHtml,
    title: `Plant Care Guides | ${SITE_NAME}`,
    description: 'Browse plant care guides from Rosary Plant House for succulents, cactus, balcony plants, monsoon care and root rot recovery in India.',
    canonicalUrl,
    image,
    schemaItems: buildGuidesIndexSchemaItems(publicBase),
    body,
  });
}

export function buildStaticContentHubHtml({
  indexHtml,
  hub,
  products = [],
  baseUrl = DEFAULT_BASE_URL,
}) {
  if (!hub?.slug) {
    throw new Error('Static content hub generation requires a hub with a slug');
  }

  const publicBase = baseUrl.replace(/\/$/, '');
  const matchedProducts = getContentHubProducts(hub, products);
  const canonicalUrl = getContentHubCanonicalUrl(hub, publicBase);
  const image = getAbsoluteImageUrl(getContentHubImage(hub), publicBase);
  const schemaItems = buildContentHubSchemaItems(hub, {
    baseUrl: publicBase,
    products: matchedProducts,
  });
  const body = `<main class="seo-content-hub-page" data-hub-slug="${escapeHtml(hub.slug)}">
  <nav aria-label="Breadcrumb">
    <a href="/">Home</a> / <a href="${escapeHtml(GUIDES_INDEX_PATH)}">Guides</a> / <span>${escapeHtml(hub.title)}</span>
  </nav>
  <article>
    <h1>${escapeHtml(hub.title)}</h1>
    <img src="${escapeHtml(getContentHubImage(hub))}" alt="${escapeHtml(getContentHubImageAlt(hub))}" />
    <p>${escapeHtml(hub.intro)}</p>
    <section>
      <h2>Quick answer</h2>
      <p>${escapeHtml(hub.answer)}</p>
    </section>
    ${renderHubSections(hub)}
    ${renderHubFaqs(hub)}
  </article>
  <section>
    <h2>Recommended plants for this guide</h2>
    ${renderHubProducts(matchedProducts, publicBase)}
  </section>
  ${renderRelatedHubLinks(hub)}
</main>`;

  return injectStaticHtml({
    indexHtml,
    title: `${hub.title} | ${SITE_NAME}`,
    description: hub.metaDescription,
    canonicalUrl,
    image,
    schemaItems,
    body,
  });
}

export function buildStaticNotFoundHtml({ indexHtml, baseUrl = DEFAULT_BASE_URL }) {
  const publicBase = baseUrl.replace(/\/$/, '');
  return injectStaticHtml({
    indexHtml,
    title: `Page Not Found | ${SITE_NAME}`,
    description: 'The requested Rosary Plant House page was not found.',
    canonicalUrl: `${publicBase}/404`,
    image: getAbsoluteImageUrl(DEFAULT_SEO_IMAGE_PATH, publicBase),
    robots: NOINDEX_ROBOTS,
    body: `<main class="seo-not-found-page">
  <h1>Page not found</h1>
  <p>This page does not exist or may have moved. Browse the plant catalogue from the home page.</p>
  <p><a href="/">Browse plants</a></p>
</main>`,
  });
}

export function buildStaticPolicyHtml({ indexHtml, baseUrl = DEFAULT_BASE_URL }) {
  const publicBase = baseUrl.replace(/\/$/, '');
  const canonicalUrl = `${publicBase}${SITE_POLICY.path}`;
  const title = `Shipping, Returns and Plant Delivery Policies | ${SITE_NAME}`;
  const description = 'Shipping, delivery ETA, replacement, refund, payment and WhatsApp support policies for Rosary Plant House live plant orders.';
  const image = getAbsoluteImageUrl(DEFAULT_SEO_IMAGE_PATH, publicBase);
  const schemaItems = [buildOrganizationSchema(), buildWebsiteSchema(), buildPolicyFaqSchema()];

  const headTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <script type="application/ld+json">${JSON.stringify(schemaItems)}</script>
`;

  const withoutManagedHead = removeManagedHeadTags(indexHtml);
  const withHead = withoutManagedHead.replace('</head>', `${headTags}</head>`);
  return withHead.replace('<div id="root"></div>', `<div id="root">${renderStaticPolicyBody()}</div>`);
}

export function buildStaticProductHtml({ indexHtml, product, baseUrl = DEFAULT_BASE_URL }) {
  const publicBase = baseUrl.replace(/\/$/, '');
  const canonicalUrl = getProductCanonicalUrl(product, publicBase);
  const title = `${getProductMetaTitle(product)} | ${SITE_NAME}`;
  const description = getProductMetaDescription(product);
  const image = absoluteUrl(getPrimaryProductImage(product), publicBase);
  const robots = getProductRobots(product);
  const productSchema = buildProductStructuredData(product, { baseUrl: publicBase });
  const breadcrumbSchema = buildBreadcrumbStructuredData(product, { baseUrl: publicBase });
  const faqSchema = buildFaqStructuredData(product);
  const schemaItems = [productSchema, breadcrumbSchema, faqSchema].filter(Boolean);

  const headTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="${escapeHtml(robots)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:type" content="product" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <script type="application/ld+json">${JSON.stringify(schemaItems)}</script>
`;

  const withoutManagedHead = removeManagedHeadTags(indexHtml);
  const withHead = withoutManagedHead.replace('</head>', `${headTags}</head>`);
  const staticBody = renderStaticBody(product, publicBase);

  return withHead.replace('<div id="root"></div>', `<div id="root">${staticBody}</div>`);
}
