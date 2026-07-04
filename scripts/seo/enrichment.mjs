const PROTECTED_STOREFRONT_FIELDS = new Set([
  'id',
  'commonName',
  'available',
  'salesPrice',
  'title',
  'imageUrl',
  'imageUrls',
  'size',
  'transit',
  'watering',
  'sunlight',
  'originalPrice',
  'category',
  'mother',
  'hanging',
  'combo',
  'indoor',
  'isRestocked',
  'placeAvailable',
  'qtyAvailable',
  'demand',
  'description',
  'name',
  'price',
  'inStock',
]);

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\r\n/g, '\n').trim();
}

function cleanNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function splitList(value) {
  return clean(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function pick(row, key) {
  return clean(row[key]);
}

function compactObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    })
  );
}

function buildFaqs(row) {
  const faqs = [];
  for (let index = 1; index <= 6; index += 1) {
    const question = pick(row, `FAQ ${index} question`);
    const answer = pick(row, `FAQ ${index} answer`);
    if (question && answer) {
      faqs.push({ question, answer });
    }
  }
  return faqs;
}

function buildTroubleshooting(row) {
  const pairs = [
    ['yellowLeaves', 'Yellow leaves reason', 'Yellow leaves solution'],
    ['leafDrop', 'Leaf drop reason', 'Leaf drop solution'],
    ['softStem', 'Soft stem reason', 'Soft stem solution'],
    ['wrinkledLeaves', 'Wrinkled leaves reason', 'Wrinkled leaves solution'],
    ['leggyGrowth', 'Leggy growth reason', 'Leggy growth solution'],
    ['sunburn', 'Sunburn reason', 'Sunburn solution'],
    ['pests', 'Pests reason', 'Pests solution'],
    ['rootRot', 'Root rot reason', 'Root rot solution'],
  ];

  const result = {};
  for (const [key, reasonKey, solutionKey] of pairs) {
    const reason = pick(row, reasonKey);
    const solution = pick(row, solutionKey);
    if (reason || solution) {
      result[key] = compactObject({ reason, solution });
    }
  }

  const recoveryTips = pick(row, 'Recovery tips');
  if (recoveryTips) result.recoveryTips = recoveryTips;
  return result;
}

export function buildEnrichment(row) {
  const productId = pick(row, 'Product ID');
  if (!productId) return null;

  const originalPrice = cleanNumber(row['Orginal Price']);
  const salesPrice = cleanNumber(row['Sales Price']);

  return compactObject({
    seo: compactObject({
      slug: pick(row, 'URL slug'),
      metaTitle: pick(row, 'Meta title'),
      metaDescription: pick(row, 'Meta description'),
      h1: pick(row, 'H1'),
      primaryKeyword: pick(row, 'Primary keyword'),
      buyingKeyword: pick(row, 'Buying keyword'),
      secondaryKeywords: splitList(row['Secondary keywords']),
      relatedPlants: splitList(row['Related plants']),
      relatedCareGuides: splitList(row['Related care guides']),
      relatedProblemGuides: splitList(row['Related problem guides']),
    }),
    careGuide: compactObject({
      plantName: pick(row, 'Plant name'),
      seoProductName: pick(row, 'SEO product name'),
      scientificName: pick(row, 'Scientific name'),
      commonNames: splitList(row['Common names']),
      family: pick(row, 'Family'),
      genus: pick(row, 'Genus'),
      plantType: pick(row, 'Plant type'),
      subcategory: pick(row, 'Subcategory'),
      siteCategory: pick(row, 'Site category'),
      growthHabit: pick(row, 'Growth habit'),
      matureSize: pick(row, 'Mature size'),
      difficulty: pick(row, 'Difficulty'),
      shortDescription: pick(row, 'Short description'),
      longDescription: pick(row, 'Long description'),
      quickAnswer: pick(row, 'Quick answer'),
      sunlight: pick(row, 'Sunlight'),
      bestPlacement: pick(row, 'Best placement'),
      directSunTolerance: pick(row, 'Direct sun tolerance'),
      indoorSuitability: pick(row, 'Indoor suitability'),
      balconySuitability: pick(row, 'Balcony suitability'),
      watering: pick(row, 'Watering'),
      summerWatering: pick(row, 'Summer watering'),
      monsoonWatering: pick(row, 'Monsoon watering'),
      winterWatering: pick(row, 'Winter watering'),
      soil: pick(row, 'Soil'),
      potDrainage: pick(row, 'Pot/drainage'),
      temperature: pick(row, 'Temperature'),
      humidity: pick(row, 'Humidity'),
      fertilizer: pick(row, 'Fertilizer'),
      pruning: pick(row, 'Pruning'),
      repotting: pick(row, 'Repotting'),
      propagation: pick(row, 'Propagation'),
      summerCare: pick(row, 'Summer care'),
      monsoonCare: pick(row, 'Monsoon care'),
      winterCare: pick(row, 'Winter care'),
      southIndiaNote: pick(row, 'South India note'),
      northIndiaNote: pick(row, 'North India note'),
    }),
    troubleshooting: buildTroubleshooting(row),
    faqs: buildFaqs(row),
    schema: compactObject({
      name: pick(row, 'Product schema name'),
      description: pick(row, 'Product schema description'),
      brand: pick(row, 'Brand'),
      sku: pick(row, 'Schema SKU'),
    }),
    merchant: compactObject({
      title: pick(row, 'Merchant Center title'),
      description: pick(row, 'Merchant Center description'),
      originalPrice,
      salesPrice,
    }),
    identity: compactObject({
      possibleIdentity1: pick(row, 'Possible identity 1'),
      possibleIdentity2: pick(row, 'Possible identity 2'),
      possibleIdentity3: pick(row, 'Possible identity 3'),
      reviewFlag: pick(row, 'Human review text-name flag'),
    }),
  });
}

export function mergeEnrichmentRows(products, rows) {
  const enrichmentById = new Map();
  for (const row of rows) {
    const productId = pick(row, 'Product ID');
    const enrichment = buildEnrichment(row);
    if (productId && enrichment) {
      enrichmentById.set(productId, enrichment);
    }
  }

  return products.map((product) => {
    const enrichment = enrichmentById.get(String(product.id));
    if (!enrichment) return product;

    const merged = { ...product };
    for (const [key, value] of Object.entries(enrichment)) {
      if (!PROTECTED_STOREFRONT_FIELDS.has(key)) {
        merged[key] = value;
      }
    }
    return merged;
  });
}

export { PROTECTED_STOREFRONT_FIELDS };
