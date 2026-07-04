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

function splitList(value) {
  return clean(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function pick(row, key) {
  return clean(row[key]);
}

const LONG_DESCRIPTION_PROMPT_MARKERS = [
  'full Plant Details sheet',
  'readable image text label',
  'skill-column format',
  'label-derived plant name',
  'source flag column',
  'image-recognized rows',
  'human-review correction',
];

const INTERNAL_REVIEW_MARKERS = [
  ...LONG_DESCRIPTION_PROMPT_MARKERS,
  'visible in the image label',
  'listed from the plant name',
  'final taxonomy checked',
  'taxonomy checked',
  'taxonomy check',
  'label-derived name',
  'human review',
];

const AWKWARD_UNCERTAINTY_PATTERN = /exact species\s+naming|species\s+naming\s*,|exact cultivar is uncertain|exact species is uncertain|broad .* care remains the safer guidance/i;

const KNOWN_OCR_REPLACEMENTS = [
  [/\bEcheveria\s+Akma\s+Lia\b/gi, 'Echeveria Akmalia'],
  [/\bAkma\s+Lia\b/gi, 'Akmalia'],
  [/\bHaworthiareonium\s+Bl\s+Aa\b/gi, 'Aeonium haworthii'],
  [/\bSedum\s+Cofss\s+Laceae\b/gi, 'Grey Sedum'],
  [/\bSedum\.\s*Stfyn\s+Ecrops\b/gi, 'Sedum Stonecrop'],
  [/\bClose\s+Fingure\b/gi, 'Close Finger'],
  [/\bFingure\b/gi, 'Finger'],
  [/\bEcheviria\b/gi, 'Echeveria'],
  [/\bPachychyllum\b/gi, 'pachyphyllum'],
];

export function hasPromptLeakage(value) {
  const text = clean(value).toLowerCase();
  return LONG_DESCRIPTION_PROMPT_MARKERS.some((marker) => text.includes(marker.toLowerCase()));
}

export function hasInternalReviewText(value) {
  const text = clean(value).toLowerCase();
  return INTERNAL_REVIEW_MARKERS.some((marker) => text.includes(marker.toLowerCase()));
}

function applyKnownOcrFixes(value) {
  let text = clean(value);
  for (const [pattern, replacement] of KNOWN_OCR_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/\s+([,.])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

function sanitizeIdentityText(value) {
  return applyKnownOcrFixes(value)
    .replace(/\s*-\s*label-derived name,\s*taxonomy\b/gi, '')
    .replace(/\b(?:Text label|Taxonomy check|Visual context):?\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function ensureSentence(value) {
  const text = clean(value);
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function getPlantTypeLabel(plantType) {
  const normalizedType = clean(plantType).toLowerCase();
  if (normalizedType.includes('cactus')) return 'cactus';
  if (normalizedType.includes('succulent')) return 'succulent';
  if (normalizedType.includes('foliage')) return 'foliage plant';
  return 'container plant';
}

function getPlantTypeIntro(name, plantType) {
  const normalizedType = clean(plantType).toLowerCase();

  if (normalizedType.includes('cactus')) {
    return `${name} is a cactus or cactus-type plant suited to bright, airy pots where the root zone can dry between watering.`;
  }

  if (normalizedType.includes('succulent')) {
    return `${name} is a succulent suited to bright, airy containers, quick drainage, and careful watering.`;
  }

  if (normalizedType.includes('foliage')) {
    return `${name} is a foliage plant suited to bright filtered light, steady drainage, and warm indoor or covered balcony conditions.`;
  }

  return `${name} is a container plant best grown with care matched to its light, watering, and drainage needs.`;
}

function getCareFocusSentence(careGuide) {
  const normalizedType = clean(careGuide.plantType).toLowerCase();

  if (normalizedType.includes('cactus')) {
    return 'For home growers, the key care points are strong light, mineral-rich soil, and long dry intervals between watering.';
  }

  if (normalizedType.includes('succulent')) {
    return 'For home growers, the key care points are bright light, fast drainage, and avoiding long wet periods.';
  }

  if (normalizedType.includes('foliage')) {
    return 'For home growers, the key care points are bright filtered light, steady drainage, and avoiding soggy soil.';
  }

  return 'For home growers, the key care points are suitable light, steady drainage, and watering only as the potting mix needs it.';
}

function buildSafeShortDescription(careGuide) {
  const name = clean(careGuide.plantName || careGuide.seoProductName || careGuide.scientificName) || 'This plant';
  const normalizedType = clean(careGuide.plantType).toLowerCase();

  if (normalizedType.includes('cactus')) {
    return `${name} is a cactus suited to strong light, sharp drainage, and dry intervals between watering. It is best grown in an airy pot where excess rain and moisture can be controlled.`;
  }

  if (normalizedType.includes('succulent')) {
    return `${name} is a compact succulent suited to bright light, fast-draining soil, and careful watering. It works well in small pots when the root zone is allowed to dry between watering.`;
  }

  if (normalizedType.includes('foliage')) {
    return `${name} is a decorative foliage plant suited to bright filtered light, airy potting mix, and steady drainage. It works well in warm indoor spots or covered balconies with good airflow.`;
  }

  return `${name} is a container plant suited to practical home and balcony growing. Match light, watering, and soil drainage to the plant type for steady growth.`;
}

function buildSafeMerchantDescription(careGuide) {
  const name = clean(careGuide.plantName || careGuide.seoProductName || careGuide.scientificName) || 'This plant';
  const label = getPlantTypeLabel(careGuide.plantType);
  const normalizedType = clean(careGuide.plantType).toLowerCase();

  if (normalizedType.includes('cactus')) {
    return `${name} is a decorative potted ${label} suited to strong light, sharp drainage, and dry watering intervals.`;
  }

  if (normalizedType.includes('succulent')) {
    return `${name} is a decorative potted ${label} suited to bright light, fast-draining soil, and careful watering.`;
  }

  if (normalizedType.includes('foliage')) {
    return `${name} is a decorative potted ${label} suited to bright filtered light, airy soil, and steady drainage.`;
  }

  return `${name} is a decorative potted ${label} suited to practical home and balcony growing.`;
}

function buildSafeLongDescription(careGuide) {
  const name = clean(careGuide.plantName || careGuide.seoProductName || careGuide.scientificName) || 'This plant';
  const intro = getPlantTypeIntro(name, careGuide.plantType);
  const coreCare = [
    ensureSentence(careGuide.sunlight),
    ensureSentence(careGuide.soil),
    ensureSentence(careGuide.watering),
  ].filter(Boolean).join(' ');
  const placement = [
    ensureSentence(careGuide.bestPlacement),
    ensureSentence(careGuide.directSunTolerance),
  ].filter(Boolean).join(' ');
  const seasonalCare = ensureSentence(
    careGuide.monsoonCare ||
    careGuide.monsoonWatering ||
    careGuide.summerCare ||
    careGuide.southIndiaNote
  );

  return [
    intro,
    coreCare || 'Use a draining potting mix, avoid stagnant water, and adjust watering to the plant group and weather.',
    placement,
    seasonalCare,
  ].filter(Boolean).join('\n\n');
}

function replaceAwkwardUncertainty(value, careGuide) {
  const replacement = getCareFocusSentence(careGuide);
  const sentences = clean(value).split(/(?<=[.!?])\s+/).filter(Boolean);
  let replaced = false;
  const cleanedSentences = sentences.map((sentence) => {
    if (!AWKWARD_UNCERTAINTY_PATTERN.test(sentence)) return sentence;
    replaced = true;
    return replacement;
  });

  if (!replaced && AWKWARD_UNCERTAINTY_PATTERN.test(value)) return replacement;

  return [...new Set(cleanedSentences)].join(' ');
}

export function sanitizePublicDescription(value, careGuide, { compact = false } = {}) {
  const text = applyKnownOcrFixes(value);
  if (!text) return '';
  return hasInternalReviewText(text)
    ? (compact ? buildSafeMerchantDescription(careGuide) : buildSafeShortDescription(careGuide))
    : text;
}

export function sanitizeLongDescription(value, careGuide) {
  const text = applyKnownOcrFixes(value);
  if (!text) return '';
  if (hasPromptLeakage(text) || hasInternalReviewText(text)) return buildSafeLongDescription(careGuide);
  return replaceAwkwardUncertainty(text, careGuide);
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

  const careGuide = compactObject({
    plantName: sanitizeIdentityText(pick(row, 'Plant name')),
    seoProductName: sanitizeIdentityText(pick(row, 'SEO product name')),
    scientificName: sanitizeIdentityText(pick(row, 'Scientific name')),
    commonNames: splitList(row['Common names']).map(sanitizeIdentityText),
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
  });

  careGuide.shortDescription = sanitizePublicDescription(careGuide.shortDescription, careGuide);
  careGuide.longDescription = sanitizeLongDescription(careGuide.longDescription, careGuide);

  const seo = compactObject({
    slug: pick(row, 'URL slug'),
    metaTitle: applyKnownOcrFixes(pick(row, 'Meta title')),
    metaDescription: applyKnownOcrFixes(pick(row, 'Meta description')),
    h1: applyKnownOcrFixes(pick(row, 'H1')),
    primaryKeyword: applyKnownOcrFixes(pick(row, 'Primary keyword')),
    buyingKeyword: applyKnownOcrFixes(pick(row, 'Buying keyword')),
    secondaryKeywords: splitList(row['Secondary keywords']).map(applyKnownOcrFixes),
    relatedPlants: splitList(row['Related plants']).map(applyKnownOcrFixes),
    relatedCareGuides: splitList(row['Related care guides']).map(applyKnownOcrFixes),
    relatedProblemGuides: splitList(row['Related problem guides']).map(applyKnownOcrFixes),
  });

  const schema = compactObject({
    name: sanitizeIdentityText(pick(row, 'Product schema name')),
    description: sanitizePublicDescription(pick(row, 'Product schema description'), careGuide),
    brand: pick(row, 'Brand'),
    sku: pick(row, 'Schema SKU'),
  });

  const merchant = compactObject({
    title: sanitizeIdentityText(pick(row, 'Merchant Center title')),
    description: sanitizePublicDescription(
      pick(row, 'Merchant Center description'),
      careGuide,
      { compact: true }
    ),
  });

  return compactObject({
    seo,
    careGuide: compactObject(careGuide),
    troubleshooting: buildTroubleshooting(row),
    faqs: buildFaqs(row),
    schema,
    merchant,
    identity: compactObject({
      possibleIdentity1: sanitizeIdentityText(pick(row, 'Possible identity 1')),
      possibleIdentity2: sanitizeIdentityText(pick(row, 'Possible identity 2')),
      possibleIdentity3: sanitizeIdentityText(pick(row, 'Possible identity 3')),
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
