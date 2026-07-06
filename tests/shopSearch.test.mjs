import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function normalizeTestText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasTestPhrase(text, phrases) {
  return phrases.some((phrase) => text.includes(normalizeTestText(phrase)));
}

test('smart shop search matches care intent phrases and price ceilings', async () => {
  let shopSearch;
  await assert.doesNotReject(async () => {
    shopSearch = await import('../src/utils/shopSearch.js');
  });

  const { filterProductsForShopSearch, matchesShopSearch } = shopSearch;
  assert.equal('SMART_SEARCH_SUGGESTIONS' in shopSearch, false);
  assert.equal(typeof filterProductsForShopSearch, 'function');
  assert.equal(typeof matchesShopSearch, 'function');

  const products = [
    {
      id: '1',
      title: 'Haworthia Zebra',
      category: 'Haworthia',
      salesPrice: 59,
      watering: 'Low',
      careGuide: {
        difficulty: 'Easy',
        matureSize: 'Compact desk-sized rosette.',
        indoorSuitability: 'Yes; suitable for a bright office desk.',
        monsoonCare: 'Reduce watering and keep airflow high during monsoon.',
      },
    },
    {
      id: '2',
      title: 'Trailing Sedum Bowl',
      category: 'Hanging',
      salesPrice: 399,
      watering: 'Moderate',
      careGuide: {
        growthHabit: 'Trailing stems for hanging pots.',
        difficulty: 'Easy to Moderate',
      },
    },
    {
      id: '3',
      title: 'Premium Anthurium',
      category: 'Indoor',
      salesPrice: 799,
      watering: 'High',
      careGuide: {
        difficulty: 'Moderate',
        indoorSuitability: 'Yes; bright indoor location.',
      },
    },
    {
      id: '4',
      title: 'Mini Mammillaria',
      category: 'Cactus',
      salesPrice: 89,
      watering: 'Low',
      careGuide: {
        plantType: 'Cactus',
        difficulty: 'Easy',
      },
    },
    {
      id: '5',
      title: "Callisia repens 'Pink Lady'",
      category: 'Sedum',
      salesPrice: 59,
      watering: 'High',
      sunlight: 'High',
      transit: 'High',
      careGuide: {
        difficulty: 'Easy',
        plantType: 'Hanging plant',
        subcategory: 'Trailing foliage plant',
      },
    },
  ];

  assert.deepEqual(
    filterProductsForShopSearch(products, 'low water').map((product) => product.id),
    ['1', '4'],
  );
  assert.equal(matchesShopSearch(products[3], 'cactus'), true);
  assert.equal(matchesShopSearch(products[2], 'indoor'), true);
  assert.equal(matchesShopSearch(products[1], 'hanging'), true);
  assert.deepEqual(
    filterProductsForShopSearch(products, 'under 100').map((product) => product.id),
    ['1', '4', '5'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'under 60').map((product) => product.id),
    ['1', '5'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'gift under 60').map((product) => product.id),
    ['1'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'anthurium').map((product) => product.id),
    ['3'],
  );
});

test('smart shop search keeps category terms out of generic care text', async () => {
  const { filterProductsForShopSearch } = await import('../src/utils/shopSearch.js');

  const products = [
    {
      id: 'succulent-reference',
      title: 'Reference Succulent',
      category: 'Succulent',
      salesPrice: 50,
      watering: 'Moderate',
      indoor: false,
      hanging: false,
      careGuide: {
        plantType: 'Succulent',
        siteCategory: 'Succulent',
        indoorSuitability: 'Conditional; works best in a very bright indoor spot.',
        growthHabit: 'Compact, clumping, trailing, or rosette-forming succulent habit.',
        longDescription: 'Related cactus care, indoor care, and hanging baskets are mentioned only as care links.',
      },
      seo: {
        relatedPlants: ['cactus'],
        relatedCareGuides: ['indoor-plant-care', 'hanging-plants-balcony'],
      },
    },
    {
      id: 'true-cactus',
      title: 'Mini Mammillaria',
      category: 'Cactus',
      salesPrice: 89,
      watering: 'Low',
      careGuide: {
        plantType: 'Cactus',
        siteCategory: 'Cactus',
      },
    },
    {
      id: 'true-indoor',
      title: 'Philodendron',
      category: 'Others',
      salesPrice: 180,
      indoor: true,
      careGuide: {
        plantType: 'Foliage plant',
        siteCategory: 'Others',
        indoorSuitability: 'Yes; generally suitable in a bright indoor location.',
      },
    },
    {
      id: 'true-hanging',
      title: 'String of Hearts',
      category: 'Others',
      salesPrice: 140,
      hanging: true,
      careGuide: {
        plantType: 'Foliage vine',
        subcategory: 'Trailing foliage vine',
        growthHabit: 'Trailing and cascading.',
      },
    },
  ];

  assert.deepEqual(
    filterProductsForShopSearch(products, 'cactus under 100').map((product) => product.id),
    ['true-cactus'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'indoor').map((product) => product.id),
    ['true-indoor'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'hanging').map((product) => product.id),
    ['true-hanging'],
  );
});

test('smart shop search keeps need intents selective', async () => {
  const { filterProductsForShopSearch } = await import('../src/utils/shopSearch.js');

  const products = [
    {
      id: 'desk-match',
      title: 'Haworthia Desk Pot',
      category: 'Haworthia',
      salesPrice: 120,
      watering: 'Low',
      careGuide: {
        difficulty: 'Easy',
        matureSize: 'Usually stays compact in a small pot.',
        bestPlacement: 'Bright office desk or windowsill.',
        indoorSuitability: 'Yes; generally suitable in a bright indoor location.',
        monsoonCare: 'Reduce watering and keep airflow high during monsoon.',
        potDrainage: 'Use a pot with a good drainage hole.',
      },
    },
    {
      id: 'compact-only',
      title: 'Outdoor Compact Succulent',
      category: 'Succulent',
      salesPrice: 160,
      watering: 'Moderate',
      careGuide: {
        difficulty: 'Easy to Moderate',
        matureSize: 'Compact, clumping, trailing, or rosette-forming succulent habit.',
        indoorSuitability: 'Conditional; only in a very bright sunny window.',
        watering: 'Water deeply, then let the mix dry well before the next watering.',
        monsoonCare: 'Reduce watering strongly and avoid prolonged wet soil.',
      },
    },
    {
      id: 'wet-foliage',
      title: 'Thirsty Foliage Plant',
      category: 'Indoor',
      salesPrice: 170,
      watering: 'High',
      careGuide: {
        difficulty: 'Moderate',
        indoorSuitability: 'Yes; generally suitable in a bright indoor location.',
        monsoonCare: 'Reduce frequency and avoid heavy soggy soil.',
      },
    },
    {
      id: 'snake-low-risk',
      title: 'Snake Plant',
      category: 'Sansevieria',
      salesPrice: 220,
      watering: 'Moderate',
      sunlight: 'Low',
      careGuide: {
        difficulty: 'Easy to Moderate',
        plantType: 'Foliage plant',
        subcategory: 'Snake plant',
        indoorSuitability: 'Yes; generally suitable in a bright indoor location.',
      },
    },
    {
      id: 'jade-low-risk',
      title: 'Jade Plant',
      category: 'Jade',
      salesPrice: 180,
      watering: 'Moderate',
      sunlight: 'Moderate',
      careGuide: {
        difficulty: 'Easy to Moderate',
        plantType: 'Succulent',
        subcategory: 'Shrubby succulent',
        watering: 'Water deeply, then let the mix dry well before the next watering.',
      },
    },
    {
      id: 'ship-risk-peperomia',
      title: 'Ripple Peperomia',
      category: 'Peperomia',
      salesPrice: 190,
      watering: 'Moderate',
      sunlight: 'Low',
      transit: 'High',
      careGuide: {
        difficulty: 'Easy to Moderate',
        plantType: 'Foliage plant',
        subcategory: 'Textured foliage plant',
        indoorSuitability: 'Yes; generally suitable in a bright indoor location.',
      },
    },
    {
      id: 'misleading-common-name',
      title: 'Scilla siberica',
      category: 'Others',
      salesPrice: 150,
      watering: 'Moderate',
      sunlight: 'Low',
      transit: 'Low',
      careGuide: {
        difficulty: 'Easy to Moderate',
        plantName: 'Scilla siberica',
        scientificName: 'Scilla siberica',
        commonNames: ['Spotted gasteria succulent'],
        plantType: 'Succulent',
        subcategory: 'Spotted succulent',
      },
    },
    {
      id: 'pink-lady-risk',
      title: "Callisia repens 'Pink Lady'",
      category: 'Sedum',
      salesPrice: 59,
      watering: 'High',
      sunlight: 'High',
      careGuide: {
        difficulty: 'Easy',
        plantType: 'Hanging plant',
        subcategory: 'Trailing foliage plant',
        growthHabit: 'Trailing and mounding',
        watering: 'Water when the top part of the mix begins to dry, not bone-dry.',
      },
    },
    {
      id: 'sunny-cactus-risk',
      title: 'Bunny Ear Cactus',
      category: 'Cactus',
      salesPrice: 49,
      watering: 'Moderate',
      sunlight: 'High',
      careGuide: {
        difficulty: 'Easy',
        plantType: 'Cactus',
        directSunTolerance: 'High once acclimated; it generally enjoys strong light.',
      },
    },
  ];

  assert.deepEqual(
    filterProductsForShopSearch(products, 'desk plant').map((product) => product.id),
    ['desk-match'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'beginner').map((product) => product.id),
    ['desk-match', 'snake-low-risk', 'jade-low-risk'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'low water').map((product) => product.id),
    ['desk-match'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'monsoon safe').map((product) => product.id),
    ['desk-match'],
  );
});

test('smart shop search does not cross-match risky water and light care terms', async () => {
  const { filterProductsForShopSearch } = await import('../src/utils/shopSearch.js');

  const products = [
    {
      id: 'low-water-sun-lover',
      title: 'Bright Cactus',
      category: 'Cactus',
      salesPrice: 80,
      watering: 'Low',
      sunlight: 'High',
      careGuide: {
        plantType: 'Cactus',
        siteCategory: 'Cactus',
        sunlight: 'Bright light with several hours of direct sun.',
        directSunTolerance: 'High once acclimated; enjoys strong direct sun.',
        indoorSuitability: 'Conditional; only in a very sunny window.',
        watering: 'Water sparingly after the mix dries fully.',
      },
    },
    {
      id: 'low-light-foliage',
      title: 'Ripple Peperomia',
      category: 'Peperomia',
      salesPrice: 120,
      watering: 'Moderate',
      sunlight: 'Low',
      careGuide: {
        plantType: 'Foliage plant',
        siteCategory: 'Peperomia',
        sunlight: 'Bright filtered light or gentle morning sun.',
        directSunTolerance: 'Limited; harsh direct afternoon sun can scorch the foliage.',
        indoorSuitability: 'Yes; generally suitable in a bright indoor location.',
        bestPlacement: 'Bright indoor window, shaded balcony shelf, or airy covered patio.',
      },
    },
    {
      id: 'thirsty-low-light',
      title: 'Peace Lily',
      category: 'Others',
      salesPrice: 160,
      watering: 'High',
      sunlight: 'Low',
      careGuide: {
        plantType: 'Foliage plant',
        siteCategory: 'Others',
        sunlight: 'Bright filtered light or gentle morning sun.',
        directSunTolerance: 'Limited; harsh direct afternoon sun can scorch the foliage.',
        indoorSuitability: 'Yes; generally suitable in a bright indoor location.',
        bestPlacement: 'Bright indoor window or shaded balcony shelf.',
      },
    },
    {
      id: 'moderate-water-sun-lover',
      title: 'Sunny Sedum',
      category: 'Sedum',
      salesPrice: 90,
      watering: 'Moderate',
      sunlight: 'High',
      careGuide: {
        plantType: 'Succulent',
        siteCategory: 'Sedum',
        sunlight: 'Bright light with several hours of direct sun.',
        directSunTolerance: 'High once acclimated; it enjoys strong light.',
        indoorSuitability: 'Conditional; only in a very sunny window.',
      },
    },
    {
      id: 'contradictory-low-sun-succulent',
      title: 'Tagged Low Sun Succulent',
      category: 'Succulent',
      salesPrice: 95,
      watering: 'Low',
      sunlight: 'Low',
      careGuide: {
        plantType: 'Succulent',
        siteCategory: 'Succulent',
        sunlight: 'Bright light with some direct sun after acclimation.',
        directSunTolerance: 'Good with acclimation.',
        indoorSuitability: 'Conditional; only in a very bright dry spot.',
      },
    },
    {
      id: 'succulent-with-foliage-label',
      title: 'Adromischus cristatus',
      category: 'Succulent',
      salesPrice: 110,
      watering: 'Moderate',
      sunlight: 'Low',
      careGuide: {
        plantName: 'Adromischus cristatus',
        plantType: 'Foliage plant',
        siteCategory: 'Succulent',
        sunlight: 'Bright filtered light or gentle morning sun.',
        directSunTolerance: 'Limited; harsh direct afternoon sun can scorch foliage.',
        indoorSuitability: 'Yes; generally suitable in a bright indoor location.',
      },
    },
  ];

  assert.deepEqual(
    filterProductsForShopSearch(products, 'low light').map((product) => product.id),
    ['low-light-foliage', 'thirsty-low-light'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'low sunlight').map((product) => product.id),
    ['low-light-foliage', 'thirsty-low-light'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'shade plant').map((product) => product.id),
    ['low-light-foliage', 'thirsty-low-light'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'no direct sun').map((product) => product.id),
    ['low-light-foliage', 'thirsty-low-light'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'direct sun').map((product) => product.id),
    ['low-water-sun-lover', 'moderate-water-sun-lover'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'high water').map((product) => product.id),
    ['thirsty-low-light'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'moderate water').map((product) => product.id),
    ['low-light-foliage', 'moderate-water-sun-lover', 'succulent-with-foliage-label'],
  );
  assert.deepEqual(
    filterProductsForShopSearch(products, 'low water').map((product) => product.id),
    ['low-water-sun-lover', 'contradictory-low-sun-succulent'],
  );
});

test('smart shop search keeps real catalog care-risk queries evidence based', async () => {
  const { filterProductsForShopSearch } = await import('../src/utils/shopSearch.js');
  const { getProductPublicCategory } = await import('../src/utils/productSeo.js');
  const products = JSON.parse(fs.readFileSync(new URL('../public/product-seo-index.json', import.meta.url), 'utf8'));
  const lowLightSafeNames = [
    'arrowhead',
    'baby rubber',
    'bird s nest snake plant',
    'chinese money plant',
    'english ivy',
    'ivy',
    'peperomia',
    'peace lily',
    'philodendron',
    'purple waffle',
    'rubber plant',
    'sansevieria',
    'snake plant',
    'spider plant',
    'syngonium',
    'watermelon peperomia',
  ];
  const lowLightSafeCategories = new Set(['Creeper', 'Indoor', 'Peperomia', 'Sansevieria']);
  const lowLightUnsafeNames = [
    'adromischus',
    'aeonium',
    'agave',
    'aloe',
    'cactus',
    'cacti',
    'cheiridopsis',
    'crassula',
    'echeveria',
    'gasteria',
    'graptopetalum',
    'haworthia',
    'hoodia',
    'jade',
    'opuntia',
    'sedum',
    'sempervivum',
    'succulent',
  ];
  const beginnerSafeNames = [
    'aloe aristata',
    'aloe brevifolia',
    'aloe minnie belle',
    'aloe vera',
    'aloe x spinosissima',
    'baby rubber',
    'chinese money plant',
    'elephant bush',
    'fairy washboard',
    'finger jade',
    'gasteria',
    'gollum jade',
    'green aloe',
    'haworthia',
    'haworthiopsis',
    'jade plant',
    'peperomia',
    'sansevieria',
    'short leaved aloe',
    'short-leaved aloe',
    'snake plant',
    'spider aloe',
    'spider plant',
    'spotted aloe',
    'tiger tooth aloe',
    'variegated aloe',
    'watermelon peperomia',
    'window haworthia',
    'zebra haworthia',
  ];
  const beginnerRiskyNames = [
    'aeonium',
    'bunny ear',
    'callisia',
    'cactus',
    'cacti',
    'cheiridopsis',
    'croton',
    'donkey tail',
    'echeveria',
    'euphorbia',
    'hanging plant',
    'hechtia',
    'houseleek',
    'hydrangea',
    'ivy',
    'kalanchoe',
    'mammillaria',
    'necklace',
    'opuntia',
    'pink lady',
    'sedum',
    'sempervivum',
    'string of',
    'trailing foliage',
    'trailing succulent',
    'turtle vine',
    'umbrella plant',
  ];

  for (const query of ['low light', 'low sunlight', 'shade plant']) {
    const matches = filterProductsForShopSearch(products, query);
    assert.ok(matches.length > 0, `${query} should return evidence-backed plants`);
    assert.ok(matches.length < 80, `${query} should not behave like broad text search`);

    for (const product of matches) {
      const careGuide = product.careGuide || {};
      const nameText = normalizeTestText([
        product.title,
        product.name,
        careGuide.plantName,
        careGuide.seoProductName,
        careGuide.scientificName,
        ...(Array.isArray(careGuide.commonNames) ? careGuide.commonNames : []),
      ].join(' '));
      const careText = normalizeTestText([
        careGuide.sunlight,
        careGuide.directSunTolerance,
        careGuide.bestPlacement,
        careGuide.indoorSuitability,
      ].join(' '));
      const hasSafeName = hasTestPhrase(nameText, lowLightSafeNames);
      const hasUnsafeName = hasTestPhrase(nameText, lowLightUnsafeNames);
      const category = getProductPublicCategory(product);

      assert.equal(normalizeTestText(product.sunlight), 'low', `${query} matched #${product.id} without low sunlight`);
      assert.match(careText, /filtered light|indirect light|limited|shaded|covered|indoor/, `${query} matched #${product.id} without low-light care evidence`);
      assert.ok(
        hasSafeName || lowLightSafeCategories.has(category),
        `${query} matched #${product.id} without a known low-light plant identity`,
      );
      assert.equal(
        hasUnsafeName && !hasSafeName,
        false,
        `${query} matched likely sun-loving plant #${product.id}`,
      );
    }
  }

  for (const [query, expectedWatering] of [
    ['high water', 'high'],
    ['moderate water', 'moderate'],
  ]) {
    const matches = filterProductsForShopSearch(products, query);
    assert.ok(matches.length > 0, `${query} should return products`);
    for (const product of matches) {
      assert.equal(normalizeTestText(product.watering), expectedWatering, `${query} matched #${product.id} with ${product.watering} watering`);
    }
  }

  const beginnerMatches = filterProductsForShopSearch(products, 'beginner');
  const beginnerIds = new Set(beginnerMatches.map((product) => String(product.id)));
  assert.ok(beginnerMatches.length >= 30, 'beginner should include a wider low-risk starter set');
  assert.equal(beginnerIds.has('12'), false, 'beginner should not include Callisia repens Pink Lady');
  for (const id of ['4', '8', '17', '73', '102', '204', '263', '281']) {
    assert.ok(beginnerIds.has(id), `beginner should include low-risk starter plant #${id}`);
  }

  for (const product of beginnerMatches) {
    const careGuide = product.careGuide || {};
    const difficulty = normalizeTestText(careGuide.difficulty);
    const primaryNameText = normalizeTestText([
      product.title,
      product.name,
      product.commonName,
      careGuide.plantName,
      careGuide.seoProductName,
      careGuide.scientificName,
      product.schema?.name,
      product.merchant?.title,
    ].join(' '));
    const riskNameText = normalizeTestText([
      primaryNameText,
      ...(Array.isArray(careGuide.commonNames) ? careGuide.commonNames : []),
      careGuide.plantType,
      careGuide.subcategory,
      careGuide.growthHabit,
    ].join(' '));

    assert.ok(
      ['easy', 'easy to moderate'].includes(difficulty),
      `beginner matched unsupported difficulty #${product.id}`,
    );
    assert.notEqual(normalizeTestText(product.watering), 'high', `beginner matched high-water #${product.id}`);
    assert.notEqual(normalizeTestText(product.sunlight), 'high', `beginner matched high-light #${product.id}`);
    assert.notEqual(normalizeTestText(product.transit), 'high', `beginner matched high-transit #${product.id}`);
    assert.ok(hasTestPhrase(primaryNameText, beginnerSafeNames), `beginner matched #${product.id} without low-risk identity`);
    assert.equal(hasTestPhrase(riskNameText, beginnerRiskyNames), false, `beginner matched risky plant #${product.id}`);
  }
});
