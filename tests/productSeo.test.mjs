import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProductCareSections,
  buildProductStructuredData,
  extractProductIdFromParam,
  findDuplicateProductSeoIdentities,
  getProductCanonicalUrl,
  getProductDisplayName,
  getProductLongDescription,
  getProductMetaDescription,
  getProductMetaTitle,
  getProductPath,
  getProductPublicCategory,
  getProductVariantSummary,
  mergeProductWithLocalEnrichment,
} from '../src/utils/productSeo.js';

test('product SEO paths keep the existing id-first route style', () => {
  const product = {
    id: '1',
    title: 'Sempervivum Tectorum',
    seo: { slug: 'sempervivum-tectorum-1' },
  };

  assert.equal(getProductPath(product), '/plant/1-sempervivum-tectorum/');
  assert.equal(extractProductIdFromParam('1-sempervivum-tectorum'), '1');
  assert.equal(extractProductIdFromParam('sempervivum-tectorum-1'), '1');
  assert.equal(extractProductIdFromParam('L12-rare-succulent'), 'L12');
});

test('public product category falls back to SEO care metadata when storefront category is generic', () => {
  assert.equal(getProductPublicCategory({
    category: 'Plants',
    careGuide: {
      siteCategory: 'Succulent',
      plantType: 'Foliage plant',
    },
  }), 'Succulent');

  assert.equal(getProductPublicCategory({
    category: 'Cactus',
    careGuide: {
      siteCategory: 'Succulent',
    },
  }), 'Cactus');

  assert.equal(getProductPublicCategory({
    careGuide: {
      plantType: 'Cactus',
    },
  }), 'Cactus');

  assert.equal(getProductPublicCategory({
    category: 'Plants',
  }), 'Plants');
});

test('local enrichment merges additively while Firestore storefront fields win', () => {
  const firestoreProduct = {
    id: '1',
    commonName: 'Red tip live',
    title: 'Sempervivum Tectorum live',
    salesPrice: 75,
    available: true,
    description: 'Keep this live description.',
  };
  const localProduct = {
    id: '1',
    commonName: 'Red tip local',
    title: 'Sempervivum tectorum local',
    salesPrice: 69,
    description: 'Generated description should not overwrite live.',
    seo: { slug: 'sempervivum-tectorum-1', metaTitle: 'Sempervivum tectorum Care Guide' },
    careGuide: { quickAnswer: 'Bright light and careful watering.' },
  };

  const merged = mergeProductWithLocalEnrichment(firestoreProduct, localProduct);

  assert.equal(merged.commonName, 'Red tip live');
  assert.equal(merged.title, 'Sempervivum Tectorum live');
  assert.equal(merged.salesPrice, 75);
  assert.equal(merged.description, 'Keep this live description.');
  assert.equal(merged.seo.metaTitle, 'Sempervivum tectorum Care Guide');
  assert.equal(merged.careGuide.quickAnswer, 'Bright light and careful watering.');
});

test('product detail descriptions use enriched data instead of Firebase description', () => {
  const firestoreProduct = {
    id: '2',
    title: 'Bergeranthus live title',
    salesPrice: 49,
    description: 'Old Firebase description should not be shown on the plant page.',
    careGuide: {
      longDescription: 'Old Firebase care guide should not win.',
      quickAnswer: 'Old Firebase quick answer should not win.',
    },
    faqs: [{ question: 'Old question?', answer: 'Old answer.' }],
  };
  const localProduct = {
    id: '2',
    title: 'Bergeranthus local title',
    salesPrice: 49,
    description: 'Protected local legacy description should not be shown either.',
    seo: {
      metaDescription: 'New enriched SEO description.',
    },
    careGuide: {
      longDescription: 'New enriched long description for the individual plant page.',
      quickAnswer: 'New enriched quick answer.',
    },
    faqs: [{ question: 'New question?', answer: 'New answer.' }],
  };

  const merged = mergeProductWithLocalEnrichment(firestoreProduct, localProduct);

  assert.equal(merged.title, 'Bergeranthus live title');
  assert.equal(merged.salesPrice, 49);
  assert.equal(merged.description, 'Old Firebase description should not be shown on the plant page.');
  assert.equal(merged.careGuide.quickAnswer, 'New enriched quick answer.');
  assert.deepEqual(merged.faqs, [{ question: 'New question?', answer: 'New answer.' }]);
  assert.equal(getProductLongDescription(merged), 'New enriched long description for the individual plant page.');
  assert.equal(getProductMetaDescription(merged), 'New enriched SEO description.');
});

test('saleable product meta titles lead with buying intent', () => {
  assert.equal(getProductMetaTitle({
    id: '1',
    title: 'Sempervivum tectorum',
    available: true,
    salesPrice: 59,
    seo: {
      metaTitle: 'Sempervivum tectorum Care Guide and Plant Details',
    },
    merchant: {
      title: 'Sempervivum tectorum Plant',
    },
  }), 'Buy Sempervivum tectorum Online');
});

test('product SEO identity uses storefront common name and offered size', () => {
  const large = {
    id: '53',
    commonName: 'Haworthia attenuata Wide Stripe',
    size: 'Large Cluster',
    title: 'Zebra Haworthia',
    available: true,
    salesPrice: 79,
    merchant: { title: 'Zebra Haworthia' },
    schema: { name: 'Zebra Haworthia' },
    seo: { slug: 'zebra-haworthia-53', metaDescription: 'Shared care description.' },
  };
  const small = { ...large, id: '67', size: 'Small Rosette' };

  assert.equal(getProductDisplayName(large), 'Haworthia attenuata Wide Stripe – Large Cluster');
  assert.notEqual(getProductDisplayName(large), getProductDisplayName(small));
  assert.equal(getProductMetaTitle(large), 'Buy Haworthia attenuata Wide Stripe – Large Cluster Online');
  assert.match(getProductMetaDescription(large), /Haworthia attenuata Wide Stripe – Large Cluster/);
  assert.equal(
    getProductVariantSummary(large),
    'Variety: Haworthia attenuata Wide Stripe. Offered size: Large Cluster.'
  );
});

test('product SEO identity does not append a size already present in the common name', () => {
  assert.equal(getProductDisplayName({
    commonName: 'Zebra Haworthia Large Cluster',
    size: 'Large Cluster',
  }), 'Zebra Haworthia Large Cluster');
});

test('variant summary keeps a fallback merchant name separate from its size', () => {
  const product = {
    merchant: { title: 'Zebra Haworthia' },
    size: 'Large Cluster',
  };

  assert.equal(getProductDisplayName(product), 'Zebra Haworthia – Large Cluster');
  assert.equal(
    getProductVariantSummary(product),
    'Variety: Zebra Haworthia. Offered size: Large Cluster.'
  );
});

test('product SEO identity retains safe fallbacks and canonical paths', () => {
  const product = { id: '53', title: 'Zebra Haworthia', seo: { slug: 'zebra-haworthia-53' } };

  assert.equal(getProductDisplayName(product), 'Zebra Haworthia');
  assert.equal(getProductVariantSummary(product), 'Variety: Zebra Haworthia.');
  assert.equal(
    getProductCanonicalUrl(product),
    'https://rosaryplanthouse.com/plant/53-zebra-haworthia/'
  );
});

test('duplicate SEO identity detection reports colliding indexable products', () => {
  const duplicates = findDuplicateProductSeoIdentities([
    {
      id: '53', commonName: 'Zebra Haworthia', size: 'Large', seoStatus: 'published',
      identityVerified: true, available: true, salesPrice: 79,
    },
    {
      id: '67', commonName: 'Zebra Haworthia', size: 'Large', seoStatus: 'published',
      identityVerified: true, available: true, salesPrice: 69,
    },
    {
      id: '68', commonName: 'Zebra Haworthia', size: 'Small', seoStatus: 'published',
      identityVerified: true, available: true, salesPrice: 59,
    },
  ]);

  assert.deepEqual(duplicates, [{
    identity: 'Zebra Haworthia – Large',
    productIds: ['53', '67'],
  }]);
});

test('product care sections organize enriched care and troubleshooting fields', () => {
  const product = {
    careGuide: {
      growthHabit: 'Low clumping mound',
      matureSize: '8-15 cm tall and wider with age.',
      shortDescription: 'Compact mesemb succulent.',
      sunlight: 'Bright light with gentle direct sun.',
      bestPlacement: 'Sunny covered balcony.',
      directSunTolerance: 'Morning sun is ideal.',
      indoorSuitability: 'Only in a very bright window.',
      balconySuitability: 'Excellent in bright covered balconies.',
      watering: 'Water only after the mix dries.',
      summerWatering: 'Every 5-8 days.',
      monsoonWatering: 'Keep much drier.',
      winterWatering: 'Every 10-14 days.',
      soil: 'Gritty cactus mix.',
      potDrainage: 'Drainage hole essential.',
      temperature: '12-32 C.',
      humidity: 'Low humidity with airflow.',
      fertilizer: 'Light cactus feed.',
      pruning: 'Remove spent flowers.',
      repotting: 'Repot every 1-2 years.',
      propagation: 'Division or seed.',
      summerCare: 'Protect roots from overheating.',
      monsoonCare: 'Avoid continuous rain.',
      winterCare: 'Keep bright and dry.',
      southIndiaNote: 'Use extra airflow.',
      northIndiaNote: 'Bright winter sun is helpful.',
    },
    troubleshooting: {
      yellowLeaves: {
        reason: 'Overwatering or low light.',
        solution: 'Dry the mix and improve light.',
      },
      rootRot: {
        reason: 'Roots stayed wet too long.',
        solution: 'Trim damaged roots and repot.',
      },
      recoveryTips: 'Trim dead growth and resume care slowly.',
    },
  };

  const sections = buildProductCareSections(product);
  const sectionById = new Map(sections.map((section) => [section.id, section]));

  assert.deepEqual(
    sectionById.get('plant-profile').items.map((item) => item.label),
    ['Growth habit', 'Mature size', 'Short description']
  );
  assert.deepEqual(
    sectionById.get('placement-light').items.map((item) => item.label),
    ['Sunlight', 'Best placement', 'Direct sun tolerance', 'Indoor suitability', 'Balcony suitability']
  );
  assert.deepEqual(
    sectionById.get('watering-seasons').items.map((item) => item.label),
    ['Watering', 'Summer watering', 'Monsoon watering', 'Winter watering']
  );
  assert.deepEqual(
    sectionById.get('soil-climate').items.map((item) => item.label),
    ['Soil', 'Pot/drainage', 'Temperature', 'Humidity']
  );
  assert.equal(sectionById.get('common-problems').problems[0].label, 'Yellow leaves');
  assert.equal(sectionById.get('common-problems').problems[0].reason, 'Overwatering or low light.');
  assert.equal(sectionById.get('recovery-tips').items[0].value, 'Trim dead growth and resume care slowly.');
});

test('product structured data includes merchant offer details and canonical URL', () => {
  const schema = buildProductStructuredData({
    id: '1',
    title: 'Sempervivum tectorum',
    commonName: 'Red tip',
    size: 'Large Rosette',
    imageUrl: 'https://example.com/1.jpg',
    salesPrice: 69,
    available: true,
    seo: {
      canonicalUrl: 'https://rosaryplanthouse.com/plant/1-sempervivum-tectorum/',
      metaDescription: 'Care guide for Sempervivum tectorum.',
    },
    schema: {
      name: 'Sempervivum tectorum',
      description: 'A hardy rosette succulent.',
    },
  });

  assert.equal(schema['@type'], 'Product');
  assert.equal(schema.url, 'https://rosaryplanthouse.com/plant/1-sempervivum-tectorum/');
  assert.equal(schema.offers.priceCurrency, 'INR');
  assert.equal(schema.offers.price, 69);
  assert.equal(schema.offers.availability, 'https://schema.org/InStock');
  assert.equal(schema.offers.seller['@id'], 'https://rosaryplanthouse.com/#organization');
  assert.equal(schema.offers.hasMerchantReturnPolicy['@id'], 'https://rosaryplanthouse.com/policies#transit-damage-policy');
  assert.equal(schema.offers.hasMerchantReturnPolicy.merchantReturnDays, 2);
  assert.equal('shippingDetails' in schema.offers, false);
  assert.equal(schema.brand.name, 'Rosary Plant House');
  assert.equal(schema.name, 'Red tip – Large Rosette');
  assert.equal(schema.size, 'Large Rosette');
});
