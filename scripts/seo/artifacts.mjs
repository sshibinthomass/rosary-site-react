import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  buildProductCareSections,
  buildProductStructuredData,
  getAbsoluteImageUrl,
  getPrimaryProductImage,
  getProductCanonicalUrl,
  getProductDisplayName,
  getProductLongDescription,
  getProductMetaDescription,
  getProductMetaTitle,
  getProductPrice,
  getProductRobots,
  isProductInStock,
  isSeoIndexable,
  PRODUCT_SEO_SITE,
} from '../../src/utils/productSeo.js';

const DEFAULT_BASE_URL = PRODUCT_SEO_SITE.url;
const SITE_NAME = PRODUCT_SEO_SITE.name;

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

function productId(product) {
  return String(product?.id ?? '').trim();
}

export function hasMerchantFeedProductRows(feedTsv = '') {
  return String(feedTsv)
    .split(/\r?\n/)
    .slice(1)
    .some((line) => line.trim().length > 0);
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

export function buildSitemapXml(products, { baseUrl = DEFAULT_BASE_URL } = {}) {
  const publicBase = baseUrl.replace(/\/$/, '');
  const staticPaths = ['/', '/about', '/contact', '/faq', '/policies', '/reviews', '/insta-reviews'];
  const urls = [
    ...staticPaths.map((path) => ({
      loc: `${publicBase}${path}`,
      priority: path === '/' ? '1.0' : '0.7',
      changefreq: 'weekly',
    })),
    ...products
      .filter(productIsPublic)
      .map((product) => ({
        loc: getProductCanonicalUrl(product, publicBase),
        priority: '0.8',
        changefreq: 'weekly',
      })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
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
  ];

  const rows = products
    .filter(productIsPublic)
    .map((product) => ({ product, price: getProductPrice(product) }))
    .filter(({ price }) => price !== null)
    .map(({ product, price }) => {
      return [
        product.schema?.sku || `RPH-${product.id}`,
        product.merchant?.title || product.schema?.name || getProductDisplayName(product),
        product.merchant?.description || product.schema?.description || getProductMetaDescription(product),
        getProductCanonicalUrl(product, baseUrl),
        absoluteUrl(getPrimaryProductImage(product), baseUrl),
        isProductInStock(product) ? 'in_stock' : 'out_of_stock',
        `${price.toFixed(2)} INR`,
        product.schema?.brand || SITE_NAME,
        'new',
      ].map(tsvCell).join('\t');
    });

  return `${headers.join('\t')}\n${rows.join('\n')}\n`;
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

function renderStaticBody(product, baseUrl) {
  const title = product.seo?.h1 || getProductDisplayName(product);
  const image = absoluteUrl(getPrimaryProductImage(product), baseUrl);
  const longDescription = getProductLongDescription(product);
  const quickAnswer = product.careGuide?.quickAnswer;
  const price = getProductPrice(product);
  const priceMarkup = price !== null
    ? `<p><strong>Price:</strong> Rs. ${price.toLocaleString('en-IN')} ${isProductInStock(product) ? 'in stock' : 'out of stock'}</p>`
    : '';

  return `<main class="seo-product-page" data-product-id="${escapeHtml(product.id)}">
  <nav aria-label="Breadcrumb">
    <a href="/">Home</a> / <a href="/category/${encodeURIComponent(product.category || 'Plants')}">${escapeHtml(product.category || 'Plants')}</a> / <span>${escapeHtml(getProductDisplayName(product))}</span>
  </nav>
  <article>
    <h1>${escapeHtml(title)}</h1>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(`${getProductDisplayName(product)} from ${SITE_NAME}`)}" />
    ${priceMarkup}
    ${quickAnswer ? `<section><h2>Quick answer</h2><p>${escapeHtml(quickAnswer)}</p></section>` : ''}
    ${longDescription ? `<section><h2>Plant details and care</h2>${renderParagraphs(longDescription)}</section>` : ''}
    ${renderCareSections(product)}
    ${renderFaqs(product)}
  </article>
</main>`;
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
