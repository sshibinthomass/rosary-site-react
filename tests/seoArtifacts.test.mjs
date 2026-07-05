import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeEnrichmentRows } from '../scripts/seo/enrichment.mjs';
import {
  buildMerchantFeedTsv,
  buildLlmsTxt,
  buildStaticContentHubHtml,
  buildStaticCategoryHtml,
  buildStaticGuidesIndexHtml,
  buildStaticNotFoundHtml,
  buildStaticPolicyHtml,
  buildStaticPublicPageHtml,
  buildSitemapXml,
  buildStaticProductHtml,
  hasMerchantFeedProductRows,
  mergeFirebaseStorefrontData,
  mergeMerchantFeedStorefrontData,
  parseMerchantFeedTsv,
  stripFirebaseOwnedFieldsForSeoIndex,
} from '../scripts/seo/artifacts.mjs';
import { getContentHubBySlug } from '../src/utils/contentHubs.js';

const storefrontProduct = {
  id: '1',
  commonName: 'Red tip',
    available: true,
    seoStatus: 'published',
    identityVerified: true,
    updatedAt: '2026-07-04T22:11:49.000Z',
    salesPrice: 69,
  title: 'Sempervivum Tectorum',
  imageUrl: 'https://example.com/1.jpg',
  size: '(1.5"-2")',
  transit: 'Low',
  watering: 'Low',
  sunlight: 'Moderate',
  originalPrice: 99,
  category: 'Succulent',
  mother: false,
  hanging: false,
  combo: false,
  indoor: false,
  isRestocked: false,
  placeAvailable: 'Top',
  qtyAvailable: 'Available',
  demand: 'VeryHigh',
  description: 'Existing description stays exactly as-is.',
};

const appShellHtml = '<!doctype html><html lang="en"><head><title>Rosary Plant House</title><meta name="description" content="Generic" /><meta property="og:image" content="/og-image.jpg" /></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>';

test('Excel enrichment never overwrites protected storefront fields', () => {
  const [merged] = mergeEnrichmentRows([storefrontProduct], [{
    'Product ID': '1',
    'Plant name': 'Sempervivum tectorum',
    'SEO product name': 'Sempervivum tectorum Plant',
    'Scientific name': 'Sempervivum tectorum',
    'Short description': 'Generated short description.',
    'Long description': 'Generated long description.',
    'Quick answer': 'Generated quick answer.',
    'URL slug': 'sempervivum-tectorum-1',
    'Meta title': 'Sempervivum tectorum Care Guide',
    'Meta description': 'Generated meta description.',
    'H1': 'Sempervivum tectorum plant care',
    'Primary keyword': 'Sempervivum tectorum care',
    'Buying keyword': 'buy Sempervivum tectorum plant',
    'Product schema name': 'Sempervivum tectorum',
    'Product schema description': 'Generated schema description.',
    'Merchant Center title': 'Sempervivum tectorum Plant',
    'Merchant Center description': 'Generated merchant description.',
    'FAQ 1 question': 'Can Sempervivum grow indoors?',
    'FAQ 1 answer': 'Only in a very bright window.',
  }]);

  for (const [key, value] of Object.entries(storefrontProduct)) {
    assert.deepEqual(merged[key], value, `${key} changed`);
  }
  assert.equal(merged.seo.slug, 'sempervivum-tectorum-1');
  assert.equal(merged.careGuide.longDescription, 'Generated long description.');
  assert.deepEqual(merged.faqs, [{
    question: 'Can Sempervivum grow indoors?',
    answer: 'Only in a very bright window.',
  }]);
});

test('Excel enrichment replaces prompt-leaked long descriptions with safe care copy', () => {
  const leakedDescription = [
    'Haworthia cooperi variegated has been merged into this full Plant Details sheet from the readable image text label.',
    'The row keeps the same skill-column format as the original Plant Details sheet, but the product-facing fields are optimized around the label-derived plant name.',
    'Care guidance is matched to the recognized plant group: succulent.',
    'Use the source flag column to separate image-recognized rows from rows where the label text was used for human-review correction.',
  ].join('\n\n');

  const [merged] = mergeEnrichmentRows([storefrontProduct], [{
    'Product ID': '1',
    'Plant name': 'Haworthia cooperi variegated',
    'Plant type': 'Succulent',
    'Sunlight': 'Bright filtered light.',
    'Watering': 'Water only after the mix dries well.',
    'Soil': 'Fast-draining succulent mix with grit.',
    'Best placement': 'Bright windowsill or covered balcony.',
    'Monsoon care': 'Protect from long wet spells.',
    'Long description': leakedDescription,
  }]);

  assert.doesNotMatch(merged.careGuide.longDescription, /full Plant Details sheet/);
  assert.doesNotMatch(merged.careGuide.longDescription, /source flag column/);
  assert.match(merged.careGuide.longDescription, /Haworthia cooperi variegated/);
  assert.match(merged.careGuide.longDescription, /Bright filtered light/);
  assert.match(merged.careGuide.longDescription, /Fast-draining succulent mix with grit/);
});

test('Excel enrichment strips workflow wording from public descriptions and uncertainty copy', () => {
  const [merged] = mergeEnrichmentRows([storefrontProduct], [{
    'Product ID': '1',
    'Plant name': 'Echeveria Akma Lia',
    'Plant type': 'Succulent',
    'Sunlight': 'Bright filtered light.',
    'Watering': 'Water only after the mix dries well.',
    'Soil': 'Fast-draining succulent mix with grit.',
    'Short description': 'Echeveria Akma Lia is listed from the plant name visible in the image label. It is best sold with final taxonomy checked before species-level publishing.',
    'Long description': 'Grow this plant in bright light. If exact species  naming , broad succulent care remains the safer guidance.',
    'Product schema description': 'Echeveria Akma Lia is listed from the plant name visible in the image label.',
    'Merchant Center description': 'Echeveria Akma Lia needs final taxonomy checked before species-level publishing.',
    'Scientific name': 'Echeveria Akma Lia - label-derived name, taxonomy',
  }]);

  const publicText = [
    merged.careGuide.plantName,
    merged.careGuide.scientificName,
    merged.careGuide.shortDescription,
    merged.careGuide.longDescription,
    merged.schema.description,
    merged.merchant.description,
  ].join('\n');

  assert.doesNotMatch(publicText, /visible in the image label|taxonomy checked|label-derived name|exact species\s+naming|Akma Lia/i);
  assert.match(merged.careGuide.plantName, /Echeveria Akmalia/);
  assert.match(merged.careGuide.shortDescription, /succulent/i);
  assert.match(merged.careGuide.longDescription, /bright light, fast drainage/i);
  assert.match(merged.merchant.description, /decorative potted succulent/i);
});

test('SEO artifacts use canonical plant URLs and omit private app pages from sitemap', () => {
  const product = {
    ...storefrontProduct,
    seo: {
      slug: 'sempervivum-tectorum-1',
      metaTitle: 'Sempervivum tectorum Care Guide',
      metaDescription: 'Generated meta description.',
      h1: 'Sempervivum tectorum plant care',
      relatedPlants: ['echeveria', 'haworthia', 'jade-plant'],
      relatedCareGuides: ['succulent-care-guide', 'monsoon-succulent-care'],
      relatedProblemGuides: ['succulent-root-rot'],
    },
    schema: {
      name: 'Sempervivum tectorum',
      description: 'Generated schema description.',
    },
    merchant: {
      title: 'Sempervivum tectorum Plant',
      description: 'Generated merchant description.',
    },
    careGuide: {
      quickAnswer: 'Generated quick answer.',
      longDescription: 'Generated long description.',
      growthHabit: 'Rosette forming',
      matureSize: '10 cm wide.',
      shortDescription: 'Generated short description.',
      sunlight: 'Bright light.',
      bestPlacement: 'Covered balcony.',
      directSunTolerance: 'Morning sun.',
      indoorSuitability: 'Bright window only.',
      balconySuitability: 'Yes.',
      watering: 'Let the mix dry.',
      summerWatering: 'Every 5-7 days.',
      monsoonWatering: 'Keep drier.',
      winterWatering: 'Every 10-14 days.',
      soil: 'Gritty succulent mix.',
      potDrainage: 'Use a drainage hole.',
      temperature: '14-32 C.',
      humidity: 'Low to moderate.',
      fertilizer: 'Light monthly feed.',
      pruning: 'Remove dry leaves.',
      repotting: 'Every 1-2 years.',
      propagation: 'Offsets or leaves.',
      summerCare: 'Protect from sudden harsh heat.',
      monsoonCare: 'Protect from long rain.',
      winterCare: 'Keep bright.',
      southIndiaNote: 'Use airflow.',
      northIndiaNote: 'Use bright winter light.',
    },
    troubleshooting: {
      yellowLeaves: {
        reason: 'Overwatering or low light.',
        solution: 'Dry the mix and improve light.',
      },
      rootRot: {
        reason: 'Wet roots.',
        solution: 'Repot into airy mix.',
      },
      recoveryTips: 'Trim dead growth and restart care slowly.',
    },
  };

  const sitemap = buildSitemapXml([product], { baseUrl: 'https://rosaryplanthouse.com' });
  assert.match(sitemap, /https:\/\/rosaryplanthouse\.com\/plant\/1-sempervivum-tectorum\//);
  assert.match(sitemap, /<lastmod>2026-07-04<\/lastmod>/);
  assert.match(sitemap, /https:\/\/rosaryplanthouse\.com\/policies/);
  assert.doesNotMatch(sitemap, /\/cart/);

  const feed = buildMerchantFeedTsv([product], { baseUrl: 'https://rosaryplanthouse.com' });
  assert.match(feed, /^id\ttitle\tdescription\tlink\timage_link\tavailability\tprice\tbrand\tcondition\tproduct_type\tshipping_label\treturn_policy_label/m);
  assert.match(feed, /RPH-1\tSempervivum tectorum Plant\tGenerated merchant description\.\thttps:\/\/rosaryplanthouse\.com\/plant\/1-sempervivum-tectorum\//);
  assert.match(feed, /in_stock\t69\.00 INR/);

  const html = buildStaticProductHtml({
    indexHtml: '<!doctype html><html lang="en"><head><title>Rosary Plant House</title><meta name="description" content="Generic" /></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>',
    product,
    baseUrl: 'https://rosaryplanthouse.com',
  });
  assert.match(html, /<title>Buy Sempervivum tectorum Plant Online \| Rosary Plant House<\/title>/);
  assert.match(html, /<h1>Sempervivum Tectorum<\/h1>/);
  assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" \/>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rosaryplanthouse\.com\/plant\/1-sempervivum-tectorum\/" \/>/);
  assert.match(html, /<script type="application\/ld\+json">/);
  assert.match(html, /"offers":\{"@type":"Offer"/);
  assert.match(html, /"price":69/);
  assert.match(html, /"seller":\{"@id":"https:\/\/rosaryplanthouse\.com\/#organization"/);
  assert.match(html, /"hasMerchantReturnPolicy":\{"@type":"MerchantReturnPolicy"/);
  assert.match(html, /"shippingDetails":\{"@type":"OfferShippingDetails"/);
  assert.match(html, /<main class="seo-product-page"/);
  assert.match(html, /<h2>Placement and light<\/h2>/);
  assert.match(html, /<dt>Best placement<\/dt>\s*<dd>Covered balcony\.<\/dd>/);
  assert.match(html, /<h2>Common problems<\/h2>/);
  assert.match(html, /<h3>Yellow leaves<\/h3>/);
  assert.match(html, /<strong>Reason:<\/strong> Overwatering or low light\./);
  assert.match(html, /<h2>Recovery tips<\/h2>/);
  assert.match(html, /<section class="seo-product-related-links">/);
  assert.match(html, /<h2>Related plant pages and guides<\/h2>/);
  assert.match(html, /<h3>Related plants<\/h3>/);
  assert.match(html, /<h3>Related care guides<\/h3>/);
  assert.match(html, /<h3>Related problem guides<\/h3>/);
  assert.match(html, /<a href="\/category\/Echeveria">Echeveria plants<\/a>/);
  assert.match(html, /<a href="\/guides\/succulents-in-india">Succulents in India: Care and Buying Guide<\/a>/);
  assert.match(html, /<a href="\/guides\/root-rot-succulent-care">Root Rot in Succulents: Signs and Recovery<\/a>/);
});

test('SEO artifacts omit unverified products from sitemap and merchant feed', () => {
  const approvedProduct = {
    ...storefrontProduct,
    id: '1',
    seoStatus: 'published',
    identityVerified: true,
    seo: { slug: 'approved-plant-1' },
  };
  const reviewProduct = {
    ...storefrontProduct,
    id: '2',
    seoStatus: 'needs_review',
    identityVerified: false,
    seo: { slug: 'review-plant-2' },
  };

  const sitemap = buildSitemapXml([approvedProduct, reviewProduct], { baseUrl: 'https://rosaryplanthouse.com' });
  assert.match(sitemap, /\/plant\/1-approved-plant\//);
  assert.doesNotMatch(sitemap, /\/plant\/2-review-plant\//);

  const feed = buildMerchantFeedTsv([approvedProduct, reviewProduct], { baseUrl: 'https://rosaryplanthouse.com' });
  assert.match(feed, /RPH-1/);
  assert.doesNotMatch(feed, /RPH-2/);
});

test('sitemap can use a source content lastmod when products do not have row timestamps', () => {
  const product = {
    ...storefrontProduct,
    updatedAt: undefined,
    seo: { slug: 'sempervivum-tectorum-1' },
  };

  const sitemap = buildSitemapXml([product], {
    baseUrl: 'https://rosaryplanthouse.com',
    lastmod: '2026-07-05T08:00:00.000Z',
  });

  assert.match(sitemap, /<loc>https:\/\/rosaryplanthouse\.com\/plant\/1-sempervivum-tectorum\/<\/loc>\s*<lastmod>2026-07-05<\/lastmod>/);
});

test('merchant feed row detection distinguishes empty feeds from product feeds', () => {
  assert.equal(hasMerchantFeedProductRows('id\ttitle\n'), false);
  assert.equal(hasMerchantFeedProductRows('id\ttitle\n\n'), false);
  assert.equal(hasMerchantFeedProductRows('id\ttitle\nRPH-1\tSempervivum\n'), true);
});

test('existing Merchant feed rows can supply storefront price data for static product schema', () => {
  const feed = [
    'id\ttitle\tdescription\tlink\timage_link\tavailability\tprice\tbrand\tcondition',
    'RPH-1-SEMPERVIVUM\tSempervivum tectorum Plant\tGenerated merchant description.\thttps://rosaryplanthouse.com/plant/1-sempervivum-tectorum/\thttps://rosaryplanthouse.com/sale_plants/1.jpg\tin_stock\t59.00 INR\tRosary Plant House\tnew',
  ].join('\n');
  const [feedProduct] = parseMerchantFeedTsv(feed);
  const [merged] = mergeMerchantFeedStorefrontData([{
    id: '1',
    seoStatus: 'published',
    identityVerified: true,
    seo: {
      slug: 'sempervivum-tectorum-1',
      metaTitle: 'Sempervivum tectorum Care Guide',
      metaDescription: 'Generated meta description.',
    },
    schema: {
      name: 'Sempervivum tectorum',
      description: 'Generated schema description.',
    },
    careGuide: {
      longDescription: 'Generated long description.',
    },
  }], [feedProduct]);

  assert.equal(merged.salesPrice, 59);
  assert.equal(merged.available, true);
  assert.equal(merged.imageUrl, 'https://rosaryplanthouse.com/sale_plants/1.jpg');
  assert.equal(merged.schema.sku, 'RPH-1-SEMPERVIVUM');
  assert.equal(merged.merchant.title, 'Sempervivum tectorum Plant');

  const html = buildStaticProductHtml({
    indexHtml: appShellHtml,
    product: merged,
    baseUrl: 'https://rosaryplanthouse.com',
  });
  assert.match(html, /"offers":\{"@type":"Offer"/);
  assert.match(html, /"price":59/);
  assert.match(html, /<strong>Price:<\/strong> Rs\. 59 in stock/);
});

test('SEO artifacts support local SEO-only products without Firebase storefront fields', () => {
  const product = {
    id: '1',
    title: 'Sempervivum tectorum',
    seo: {
      slug: 'sempervivum-tectorum-1',
      metaTitle: 'Sempervivum tectorum Care Guide',
      metaDescription: 'Generated meta description.',
      h1: 'Sempervivum tectorum plant care',
      relatedPlants: ['echeveria', 'haworthia', 'jade-plant'],
      relatedCareGuides: ['succulent-care-guide', 'monsoon-succulent-care'],
      relatedProblemGuides: ['succulent-root-rot'],
    },
    schema: {
      name: 'Sempervivum tectorum',
      description: 'Generated schema description.',
      brand: 'Rosary Plant House',
      sku: 'RPH-1',
    },
    merchant: {
      title: 'Sempervivum tectorum Plant',
      description: 'Generated merchant description.',
    },
    careGuide: {
      longDescription: 'Generated long description.',
    },
  };

  const feed = buildMerchantFeedTsv([product], { baseUrl: 'https://rosaryplanthouse.com' });
  assert.doesNotMatch(feed, /RPH-1/);

  const html = buildStaticProductHtml({
    indexHtml: '<!doctype html><html lang="en"><head><title>Rosary Plant House</title></head><body><div id="root"></div></body></html>',
    product,
    baseUrl: 'https://rosaryplanthouse.com',
  });
  assert.match(html, /<meta property="og:image" content="https:\/\/rosaryplanthouse\.com\/sale_plants\/1\.jpg" \/>/);
  assert.doesNotMatch(html, /<strong>Price:<\/strong>/);
  assert.doesNotMatch(html, /Rs\. 0/);
});

test('static policies page includes crawlable policy content and merchant schema', () => {
  const html = buildStaticPolicyHtml({
    indexHtml: appShellHtml,
    baseUrl: 'https://rosaryplanthouse.com',
  });

  assert.match(html, /<title>Shipping, Returns and Plant Delivery Policies \| Rosary Plant House<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rosaryplanthouse\.com\/policies" \/>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/rosaryplanthouse\.com\/og-image\.jpg" \/>/);
  assert.match(html, /<main class="seo-policy-page"/);
  assert.match(html, /Replacement is arranged with your next order/);
  assert.match(html, /Bangalore<\/dt>\s*<dd>1-2 days from dispatch<\/dd>/);
  assert.match(html, /ShippingService/);
  assert.match(html, /MerchantReturnPolicy/);
});

test('static public pages replace the SPA shell with route-specific crawlable HTML', () => {
  const pages = [
    ['home', /<title>Buy Succulents, Cacti and Indoor Plants Online \| Rosary Plant House<\/title>/, /<img src="\/home\/hero-natural-nursery\.jpg"[\s\S]*<a href="\/shop"><img src="\/home\/browse-every-plant-natural\.jpg"[\s\S]*Shop all plants<\/a>/],
    ['shop', /<title>Shop Succulents, Cacti and Indoor Plants \| Rosary Plant House<\/title>/, /<main class="seo-shop-page"/],
    ['faq', /<title>Help &amp; FAQ \| Rosary Plant House<\/title>/, /All over South India and major cities in North India/],
    ['contact', /<title>Contact Rosary Plant House \| Rosary Plant House<\/title>/, /WhatsApp support: Every day, 9 AM to 9 PM/],
    ['about', /<title>About Rosary Plant House \| Rosary Plant House<\/title>/, /nursery in Coonoor, The Nilgiris/],
    ['reviews', /<title>Customer Reviews \| Rosary Plant House<\/title>/, /healthy plants and careful packing/],
    ['insta-reviews', /<title>Customer Stories \| Rosary Plant House<\/title>/, /Instagram story reviews/],
  ];

  for (const [page, titlePattern, bodyPattern] of pages) {
    const html = buildStaticPublicPageHtml({
      indexHtml: appShellHtml,
      page,
      baseUrl: 'https://rosaryplanthouse.com',
      reviews: [{ author: 'Aindrila', rating: 5, text: 'All are healthy plants and careful packing.' }],
    });

    assert.match(html, titlePattern);
    assert.match(html, bodyPattern);
    assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" \/>/);
    assert.doesNotMatch(html, /<title>Rosary Plant House<\/title>/);
  }
});

test('static FAQ content reuses the verified policy facts', () => {
  const html = buildStaticPublicPageHtml({
    indexHtml: appShellHtml,
    page: 'faq',
    baseUrl: 'https://rosaryplanthouse.com',
  });

  assert.match(html, /All over South India and major cities in North India/);
  assert.match(html, /Cash on delivery is not available/);
  assert.match(html, /Video is preferred; photos are also accepted/);
  assert.match(html, /refund can be processed if the customer needs it/);
  assert.doesNotMatch(html, /COD yet|all major part of the Country|customer's next order/);
});

test('static category pages expose category-specific titles, links, and ItemList schema', () => {
  const product = {
    ...storefrontProduct,
    seo: { slug: 'sempervivum-tectorum-1', metaTitle: 'Sempervivum tectorum Care Guide' },
    schema: { name: 'Sempervivum tectorum', description: 'Generated schema description.' },
    merchant: { title: 'Sempervivum tectorum Plant', description: 'Generated merchant description.' },
  };

  const html = buildStaticCategoryHtml({
    indexHtml: appShellHtml,
    category: 'Succulent',
    products: [product],
    baseUrl: 'https://rosaryplanthouse.com',
  });

  assert.match(html, /<title>Buy Succulent Plants Online \| Rosary Plant House<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rosaryplanthouse\.com\/category\/Succulent" \/>/);
  assert.match(html, /<h1>Buy Succulent plants online<\/h1>/);
  assert.match(html, /https:\/\/rosaryplanthouse\.com\/plant\/1-sempervivum-tectorum\//);
  assert.match(html, /"@type":"ItemList"/);
});

test('top static category pages include crawlable guidance, FAQs, guide links, and product links', () => {
  const cases = [
    {
      category: 'Succulent',
      expectedCopy: /beginner-friendly succulents/,
      expectedCare: /fast-draining soil/,
      expectedGuide: /\/guides\/succulents-in-india/,
    },
    {
      category: 'Cactus',
      expectedCopy: /bright balconies and sunny windows/,
      expectedCare: /gritty cactus mix/,
      expectedGuide: /\/guides\/cactus-care-india/,
    },
    {
      category: 'Echeveria',
      expectedCopy: /rosette succulents/,
      expectedCare: /protect them from long rain spells/,
      expectedGuide: /\/guides\/buy-succulents-online-india/,
    },
    {
      category: 'Haworthia',
      expectedCopy: /bright filtered light/,
      expectedCare: /avoid harsh afternoon sun/,
      expectedGuide: /\/guides\/indoor-succulent-care/,
    },
  ];

  for (const { category, expectedCopy, expectedCare, expectedGuide } of cases) {
    const product = {
      ...storefrontProduct,
      category,
      title: `${category} Test Plant`,
      commonName: `${category} Test Plant`,
      seo: { slug: `${category.toLowerCase()}-test-plant-1` },
      careGuide: {
        siteCategory: category,
        plantType: category,
      },
    };

    const html = buildStaticCategoryHtml({
      indexHtml: appShellHtml,
      category,
      products: [product],
      baseUrl: 'https://rosaryplanthouse.com',
    });

    assert.match(html, /<section class="seo-category-intro">/);
    assert.match(html, expectedCopy);
    assert.match(html, expectedCare);
    assert.match(html, new RegExp(`Frequently asked questions about ${category} plants`));
    assert.match(html, expectedGuide);
    assert.match(html, new RegExp(`/plant/1-${category.toLowerCase()}-test-plant/`));
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /"@type":"BreadcrumbList"/);
  }
});

test('static category pages use SEO care category when storefront category is generic', () => {
  const product = {
    ...storefrontProduct,
    category: 'Plants',
    seo: { slug: 'sempervivum-tectorum-1', metaTitle: 'Sempervivum tectorum Care Guide' },
    schema: { name: 'Sempervivum tectorum', description: 'Generated schema description.' },
    merchant: { title: 'Sempervivum tectorum Plant', description: 'Generated merchant description.' },
    careGuide: {
      siteCategory: 'Succulent',
      plantType: 'Succulent',
    },
  };

  const html = buildStaticCategoryHtml({
    indexHtml: appShellHtml,
    category: 'Succulent',
    products: [product],
    baseUrl: 'https://rosaryplanthouse.com',
  });

  assert.match(html, /<a href="\/plant\/1-sempervivum-tectorum\/">Sempervivum Tectorum<\/a>/);
  assert.match(html, /"name":"Sempervivum Tectorum"/);
  assert.match(html, /"url":"https:\/\/rosaryplanthouse\.com\/plant\/1-sempervivum-tectorum\/"/);
});

test('static content hub pages expose article answers, FAQs, product links, and schema', () => {
  const hub = getContentHubBySlug('succulents-in-india');
  const product = {
    ...storefrontProduct,
    seo: { slug: 'sempervivum-tectorum-1', metaTitle: 'Sempervivum tectorum Care Guide' },
    schema: { name: 'Sempervivum tectorum', description: 'Generated schema description.' },
    merchant: { title: 'Sempervivum tectorum Plant', description: 'Generated merchant description.' },
  };

  const html = buildStaticContentHubHtml({
    indexHtml: appShellHtml,
    hub,
    products: [product],
    baseUrl: 'https://rosaryplanthouse.com',
  });

  assert.match(html, /<title>Succulents in India: Care and Buying Guide \| Rosary Plant House<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rosaryplanthouse\.com\/guides\/succulents-in-india" \/>/);
  assert.match(html, /<main class="seo-content-hub-page"/);
  assert.match(html, /Succulents in India/);
  assert.match(html, /<img src="\/guides\/guide-succulent-group-nursery\.jpg" alt="Succulent nursery collection for Rosary Plant House care guides" \/>/);
  assert.match(html, /\/plant\/1-sempervivum-tectorum\//);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"image":"https:\/\/rosaryplanthouse\.com\/guides\/guide-succulent-group-nursery\.jpg"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"@type":"ItemList"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
});

test('static guides index page lists every content hub with crawlable schema', () => {
  const html = buildStaticGuidesIndexHtml({
    indexHtml: appShellHtml,
    baseUrl: 'https://rosaryplanthouse.com',
  });

  assert.match(html, /<title>Plant Care Guides \| Rosary Plant House<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rosaryplanthouse\.com\/guides" \/>/);
  assert.match(html, /<main class="seo-guides-index-page"/);
  assert.match(html, /<img src="\/guides\/guide-succulent-group-nursery\.jpg" alt="Succulent nursery collection for Rosary Plant House care guides" loading="lazy" \/>/);
  assert.match(html, /\/guides\/succulents-in-india/);
  assert.match(html, /\/guides\/low-water-balcony-plants/);
  assert.match(html, /\/guides\/monsoon-succulent-care/);
  assert.match(html, /"@type":"CollectionPage"/);
  assert.match(html, /"@type":"ItemList"/);
});

test('sitemap includes static content hub URLs for informational search demand', () => {
  const sitemap = buildSitemapXml([storefrontProduct], { baseUrl: 'https://rosaryplanthouse.com' });

  assert.match(sitemap, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
  assert.match(sitemap, /<loc>https:\/\/rosaryplanthouse\.com\/shop<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/rosaryplanthouse\.com\/guides<\/loc>/);
  assert.match(sitemap, /https:\/\/rosaryplanthouse\.com\/guides\/succulents-in-india/);
  assert.match(sitemap, /https:\/\/rosaryplanthouse\.com\/guides\/low-water-balcony-plants/);
  assert.match(sitemap, /https:\/\/rosaryplanthouse\.com\/guides\/monsoon-succulent-care/);
  assert.match(sitemap, /<image:loc>https:\/\/rosaryplanthouse\.com\/guides\/guide-succulent-group-nursery\.jpg<\/image:loc>/);
  assert.match(sitemap, /<image:title>Succulent nursery collection for Rosary Plant House care guides<\/image:title>/);
  assert.match(sitemap, /<image:loc>https:\/\/example\.com\/1\.jpg<\/image:loc>/);
  assert.match(sitemap, /<image:title>Sempervivum Tectorum from Rosary Plant House<\/image:title>/);
});

test('llms.txt summarizes canonical public pages, policies, guides, feed, and OpenAI crawler intent', () => {
  const text = buildLlmsTxt([storefrontProduct], { baseUrl: 'https://rosaryplanthouse.com' });

  assert.match(text, /^# Rosary Plant House/m);
  assert.match(text, /https:\/\/rosaryplanthouse\.com\/policies/);
  assert.match(text, /https:\/\/rosaryplanthouse\.com\/guides\/buy-succulents-online-india/);
  assert.match(text, /https:\/\/rosaryplanthouse\.com\/google-merchant-feed\.tsv/);
  assert.match(text, /OAI-SearchBot and ChatGPT-User are allowed/);
  assert.match(text, /Sempervivum Tectorum: https:\/\/rosaryplanthouse\.com\/plant\/1-sempervivum-tectorum\//);
});

test('static not-found artifact is noindex for invalid product and route fallbacks', () => {
  const html = buildStaticNotFoundHtml({
    indexHtml: appShellHtml,
    baseUrl: 'https://rosaryplanthouse.com',
  });

  assert.match(html, /<title>Page Not Found \| Rosary Plant House<\/title>/);
  assert.match(html, /<meta name="robots" content="noindex,follow" \/>/);
  assert.match(html, /<main class="seo-not-found-page"/);
});

test('SEO artifact generation merges Firebase identity without writing it to the SEO index', () => {
  const localProduct = {
    id: '1',
    seoStatus: 'published',
    identityVerified: true,
    seo: {
      slug: 'sempervivum-tectorum-1',
      metaTitle: 'Sempervivum tectorum Care Guide',
    },
    schema: {
      name: 'Sempervivum tectorum',
      description: 'Generated schema description.',
    },
    merchant: {
      title: 'Sempervivum tectorum Plant',
      description: 'Generated merchant description.',
    },
    careGuide: {
      longDescription: 'Generated long description.',
    },
  };
  const firebaseProduct = {
    id: '1',
    title: 'Sempervivum tectorum',
    commonName: 'Red tip',
    name: 'Red tip',
    available: true,
    salesPrice: 69,
    imageUrl: 'https://example.com/1.jpg',
    category: 'Succulent',
  };

  const [artifactProduct] = mergeFirebaseStorefrontData([localProduct], [firebaseProduct]);
  assert.equal(artifactProduct.title, 'Sempervivum tectorum');
  assert.equal(artifactProduct.commonName, 'Red tip');
  assert.equal(artifactProduct.salesPrice, 69);
  assert.equal(artifactProduct.schema.name, 'Sempervivum tectorum');

  const feed = buildMerchantFeedTsv([artifactProduct], { baseUrl: 'https://rosaryplanthouse.com' });
  assert.match(feed, /RPH-1\tSempervivum tectorum Plant\tGenerated merchant description\./);
  assert.match(feed, /in_stock\t69\.00 INR/);

  const [seoIndexProduct] = stripFirebaseOwnedFieldsForSeoIndex([artifactProduct]);
  assert.equal(seoIndexProduct.id, '1');
  assert.equal(seoIndexProduct.schema.name, 'Sempervivum tectorum');
  assert.equal(seoIndexProduct.title, undefined);
  assert.equal(seoIndexProduct.name, undefined);
  assert.equal(seoIndexProduct.commonName, undefined);
  assert.equal(seoIndexProduct.salesPrice, undefined);
  assert.equal(seoIndexProduct.available, undefined);
  assert.equal(seoIndexProduct.imageUrl, undefined);
});
