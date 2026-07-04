import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  buildProductCareSections,
  buildProductStructuredData,
  getPrimaryProductImage,
  getProductCanonicalUrl,
  getProductDisplayName,
  getProductLongDescription,
  getProductMetaDescription,
  getProductMetaTitle,
  isProductInStock,
  PRODUCT_SEO_SITE,
} from '../../src/utils/productSeo.js';

const DEFAULT_BASE_URL = PRODUCT_SEO_SITE.url;
const SITE_NAME = PRODUCT_SEO_SITE.name;

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
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${baseUrl.replace(/\/$/, '')}/${String(url).replace(/^\//, '')}`;
}

function productIsPublic(product) {
  return product && product.id && product.available !== false;
}

export function buildSitemapXml(products, { baseUrl = DEFAULT_BASE_URL } = {}) {
  const publicBase = baseUrl.replace(/\/$/, '');
  const staticPaths = ['/', '/about', '/contact', '/faq', '/reviews', '/insta-reviews'];
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
    .map((product) => {
      const price = Number(product.salesPrice ?? product.price ?? product.merchant?.salesPrice ?? 0);
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
  const price = Number(product.salesPrice ?? product.price ?? 0);

  return `<main class="seo-product-page" data-product-id="${escapeHtml(product.id)}">
  <nav aria-label="Breadcrumb">
    <a href="/">Home</a> / <a href="/category/${encodeURIComponent(product.category || 'Plants')}">${escapeHtml(product.category || 'Plants')}</a> / <span>${escapeHtml(getProductDisplayName(product))}</span>
  </nav>
  <article>
    <h1>${escapeHtml(title)}</h1>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(`${getProductDisplayName(product)} from ${SITE_NAME}`)}" />
    <p><strong>Price:</strong> Rs. ${price.toLocaleString('en-IN')} ${isProductInStock(product) ? 'in stock' : 'out of stock'}</p>
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
  const productSchema = buildProductStructuredData(product, { baseUrl: publicBase });
  const breadcrumbSchema = buildBreadcrumbStructuredData(product, { baseUrl: publicBase });
  const faqSchema = buildFaqStructuredData(product);
  const schemaItems = [productSchema, breadcrumbSchema, faqSchema].filter(Boolean);

  const headTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
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
