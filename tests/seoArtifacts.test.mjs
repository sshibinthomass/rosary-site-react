import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeEnrichmentRows } from '../scripts/seo/enrichment.mjs';
import {
  buildMerchantFeedTsv,
  buildSitemapXml,
  buildStaticProductHtml,
} from '../scripts/seo/artifacts.mjs';

const storefrontProduct = {
  id: '1',
  commonName: 'Red tip',
  available: true,
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

test('SEO artifacts use canonical plant URLs and omit private app pages from sitemap', () => {
  const product = {
    ...storefrontProduct,
    seo: {
      slug: 'sempervivum-tectorum-1',
      metaTitle: 'Sempervivum tectorum Care Guide',
      metaDescription: 'Generated meta description.',
      h1: 'Sempervivum tectorum plant care',
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
  assert.doesNotMatch(sitemap, /\/cart/);

  const feed = buildMerchantFeedTsv([product], { baseUrl: 'https://rosaryplanthouse.com' });
  assert.match(feed, /^id\ttitle\tdescription\tlink\timage_link\tavailability\tprice\tbrand\tcondition/m);
  assert.match(feed, /RPH-1\tSempervivum tectorum Plant\tGenerated merchant description\.\thttps:\/\/rosaryplanthouse\.com\/plant\/1-sempervivum-tectorum\//);
  assert.match(feed, /in_stock\t69\.00 INR/);

  const html = buildStaticProductHtml({
    indexHtml: '<!doctype html><html lang="en"><head><title>Rosary Plant House</title><meta name="description" content="Generic" /></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>',
    product,
    baseUrl: 'https://rosaryplanthouse.com',
  });
  assert.match(html, /<title>Sempervivum tectorum Care Guide \| Rosary Plant House<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rosaryplanthouse\.com\/plant\/1-sempervivum-tectorum\/" \/>/);
  assert.match(html, /<script type="application\/ld\+json">/);
  assert.match(html, /<main class="seo-product-page"/);
  assert.match(html, /<h2>Placement and light<\/h2>/);
  assert.match(html, /<dt>Best placement<\/dt>\s*<dd>Covered balcony\.<\/dd>/);
  assert.match(html, /<h2>Common problems<\/h2>/);
  assert.match(html, /<h3>Yellow leaves<\/h3>/);
  assert.match(html, /<strong>Reason:<\/strong> Overwatering or low light\./);
  assert.match(html, /<h2>Recovery tips<\/h2>/);
});
