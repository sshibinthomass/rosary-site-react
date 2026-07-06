import {
  getProductDisplayName,
  getProductPrice,
  getProductPublicCategory,
} from './productSeo.js';

const PRICE_PATTERNS = Object.freeze([
  /\b(?:under|below|less than|up to|upto|max(?:imum)?|within)\s*(?:rs\.?|inr|\u20b9)?\s*([0-9][0-9,]*)\b/i,
  /\b(?:rs\.?|inr|\u20b9)\s*([0-9][0-9,]*)\s*(?:or less|and below|max|budget)?\b/i,
]);

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'budget',
  'care',
  'for',
  'friendly',
  'in',
  'need',
  'needs',
  'no',
  'of',
  'on',
  'or',
  'plant',
  'plants',
  'safe',
  'the',
  'to',
  'without',
  'with',
]);

const HARDY_MONSOON_CATEGORIES = new Set([
  'Aloe',
  'Cactus',
  'Crassula',
  'Haworthia',
  'Jade',
  'Sansevieria',
  'Sedum',
  'Succulent',
]);

const LOW_LIGHT_FRIENDLY_CATEGORIES = new Set([
  'Creeper',
  'Indoor',
  'Peperomia',
  'Sansevieria',
]);

const LOW_LIGHT_SAFE_NAME_PHRASES = Object.freeze([
  'aglaonema',
  'arrowhead',
  'baby rubber',
  'bird s nest snake plant',
  'chinese money plant',
  'chlorophytum',
  'english ivy',
  'ivy',
  'peperomia',
  'peace lily',
  'philodendron',
  'pilea',
  'purple waffle',
  'rubber plant',
  'sansevieria',
  'snake plant',
  'spider plant',
  'syngonium',
  'watermelon peperomia',
]);

const LOW_LIGHT_UNSAFE_NAME_PHRASES = Object.freeze([
  'adromischus',
  'aeonium',
  'agave',
  'aloe',
  'cactus',
  'cacti',
  'cheiridopsis',
  'crassula',
  'croton',
  'echeveria',
  'euphorbia',
  'gasteria',
  'graptopetalum',
  'haworthia',
  'haworthiopsis',
  'hoodia',
  'jade',
  'kalanchoe',
  'mammillaria',
  'opuntia',
  'pachyphytum',
  'portulaca',
  'portulacaria',
  'sedum',
  'sempervivum',
  'stapelia',
  'succulent',
]);

const BEGINNER_SAFE_NAME_PHRASES = Object.freeze([
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
]);

const BEGINNER_RISKY_NAME_PHRASES = Object.freeze([
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
]);

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text, phrases) {
  return phrases.some((phrase) => text.includes(normalizeSearchText(phrase)));
}

function hasWord(text, word) {
  return new RegExp(`\\b${normalizeSearchText(word)}\\b`).test(text);
}

function valuesOf(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function getCareText(product, keys) {
  const careGuide = product?.careGuide || {};
  return normalizeSearchText(keys.flatMap((key) => valuesOf(careGuide[key])).join(' '));
}

function getBooleanFlag(product, key) {
  const value = product?.[key];
  if (value === true) return true;
  return ['1', 'true', 'yes'].includes(normalizeSearchText(value));
}

function getCategoryCandidates(product = {}) {
  const careGuide = product.careGuide || {};
  return [
    getProductPublicCategory(product),
    product.category,
    careGuide.siteCategory,
    careGuide.plantType,
    careGuide.subcategory,
  ].map(normalizeSearchText).filter(Boolean);
}

function matchesCategory(product, categoryNames) {
  const normalizedCategories = categoryNames.map(normalizeSearchText);
  return getCategoryCandidates(product).some((candidate) =>
    normalizedCategories.some((category) => candidate === category || hasWord(candidate, category))
  );
}

export function buildShopIdentitySearchText(product = {}) {
  const careGuide = product.careGuide || {};
  const schema = product.schema || {};
  const merchant = product.merchant || {};

  return normalizeSearchText([
    product.id,
    getProductDisplayName(product),
    getProductPublicCategory(product),
    product.category,
    careGuide.plantName,
    careGuide.seoProductName,
    careGuide.scientificName,
    ...valuesOf(careGuide.commonNames),
    careGuide.plantType,
    careGuide.subcategory,
    careGuide.siteCategory,
    schema.name,
    merchant.title,
  ].join(' '));
}

export function buildShopCareSearchText(product = {}) {
  const careGuide = product.careGuide || {};
  return normalizeSearchText([
    product.watering,
    product.sunlight,
    careGuide.difficulty,
    careGuide.growthHabit,
    careGuide.matureSize,
    careGuide.shortDescription,
    careGuide.sunlight,
    careGuide.bestPlacement,
    careGuide.directSunTolerance,
    careGuide.indoorSuitability,
    careGuide.balconySuitability,
    careGuide.watering,
    careGuide.summerWatering,
    careGuide.monsoonWatering,
    careGuide.winterWatering,
    careGuide.soil,
    careGuide.potDrainage,
    careGuide.temperature,
    careGuide.humidity,
    careGuide.summerCare,
    careGuide.monsoonCare,
    careGuide.winterCare,
    careGuide.southIndiaNote,
    careGuide.northIndiaNote,
  ].join(' '));
}

export function buildShopSearchText(product = {}) {
  return normalizeSearchText([
    buildShopIdentitySearchText(product),
    buildShopCareSearchText(product),
  ].join(' '));
}

function extractMaxPrice(rawQuery) {
  const query = String(rawQuery || '');

  for (const pattern of PRICE_PATTERNS) {
    const match = query.match(pattern);
    if (!match) continue;

    const value = Number(String(match[1]).replace(/,/g, ''));
    if (Number.isFinite(value) && value > 0) return value;
  }

  return null;
}

function stripPatterns(value, patterns) {
  return patterns.reduce((result, pattern) => {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    return result.replace(new RegExp(pattern.source, flags), ' ');
  }, value);
}

function getWateringText(product) {
  return normalizeSearchText([
    product?.watering,
    product?.careGuide?.watering,
    product?.careGuide?.summerWatering,
    product?.careGuide?.monsoonWatering,
    product?.careGuide?.winterWatering,
  ].join(' '));
}

function getSunlightText(product) {
  return normalizeSearchText([
    product?.sunlight,
    product?.careGuide?.sunlight,
    product?.careGuide?.bestPlacement,
    product?.careGuide?.directSunTolerance,
    product?.careGuide?.indoorSuitability,
    product?.careGuide?.balconySuitability,
  ].join(' '));
}

function isHighWater(product) {
  const watering = normalizeSearchText(product?.watering);
  const careWatering = normalizeSearchText(product?.careGuide?.watering);
  const wateringText = getWateringText(product);
  return (
    watering === 'high' ||
    careWatering === 'high' ||
    hasAny(wateringText, ['water daily', 'constant moisture'])
  );
}

function isHighTransitRisk(product) {
  return [
    product?.transit,
    product?.transitRisk,
    product?.shippingRisk,
    product?.careGuide?.transit,
    product?.careGuide?.transitRisk,
    product?.careGuide?.shippingRisk,
  ].some((value) => {
    const risk = normalizeSearchText(value);
    return risk === 'high' || risk === 'high risk' || risk === 'fragile';
  });
}

function matchesHighWater(product) {
  const watering = normalizeSearchText(product?.watering);
  return watering === 'high';
}

function matchesModerateWater(product) {
  const watering = normalizeSearchText(product?.watering);
  return watering === 'moderate' || watering === 'medium';
}

function matchesLowWater(product) {
  const watering = normalizeSearchText(product?.watering);
  const wateringText = getWateringText(product);

  if (['low', 'very low'].includes(watering)) return true;
  if (watering && watering !== 'not specific') return false;

  return hasAny(wateringText, [
    'dry fully',
    'infrequent',
    'sparingly',
    'water only after',
    'water sparingly',
  ]) && !isHighWater(product);
}

function isDirectSunDemanding(product) {
  const sunlight = normalizeSearchText(product?.sunlight);
  const lightText = getSunlightText(product);

  return (
    sunlight === 'high' ||
    hasAny(lightText, [
      '4 6 hours',
      'several hours of direct',
      'direct morning or mild afternoon sun',
      'strong direct sun',
      'strong light',
      'full sun',
      'sunny balcony',
      'sunny window',
      'very sunny',
      'brightest',
      'very bright dry spot',
      'enjoys strong',
    ])
  );
}

function isStrongDirectSunMatch(product) {
  const sunlight = normalizeSearchText(product?.sunlight);
  const lightText = getSunlightText(product);

  return (
    sunlight === 'high' ||
    hasAny(lightText, [
      '4 6 hours',
      'several hours of direct',
      'direct morning or mild afternoon sun',
      'strong direct sun',
      'full sun',
      'sunny balcony',
      'sunny window',
      'very sunny',
      'enjoys strong direct',
    ])
  );
}

function hasLimitedDirectSunEvidence(product) {
  const careGuide = product?.careGuide || {};
  const sunlight = normalizeSearchText(careGuide.sunlight);
  const placement = normalizeSearchText(careGuide.bestPlacement);
  const directSunTolerance = normalizeSearchText(careGuide.directSunTolerance);

  return (
    directSunTolerance.startsWith('limited') ||
    hasAny(directSunTolerance, [
      'avoid direct',
      'no direct',
      'harsh direct afternoon sun can scorch',
      'too much hard sun',
      'hard afternoon sun',
      'strong afternoon sun can stress',
    ]) ||
    hasAny(sunlight, [
      'filtered light',
      'indirect light',
      'bright filtered',
      'bright indirect',
    ]) ||
    hasAny(placement, [
      'shaded balcony',
      'covered patio',
      'covered balcony',
      'indoor window',
      'indoor shelf',
    ])
  );
}

function isFoliageOrKnownLowLightCategory(product) {
  const category = getProductPublicCategory(product);
  const careGuide = product?.careGuide || {};
  const nameText = normalizeSearchText([
    getProductDisplayName(product),
    careGuide.plantName,
    careGuide.seoProductName,
    careGuide.scientificName,
    ...valuesOf(careGuide.commonNames),
    product?.schema?.name,
  ].join(' '));
  const hasSafeName = hasAny(nameText, LOW_LIGHT_SAFE_NAME_PHRASES);
  const hasUnsafeName = hasAny(nameText, LOW_LIGHT_UNSAFE_NAME_PHRASES);

  if (hasUnsafeName && !hasSafeName) return false;

  return (
    hasSafeName ||
    LOW_LIGHT_FRIENDLY_CATEGORIES.has(category)
  );
}

function matchesLowLight(product) {
  const sunlight = normalizeSearchText(product?.sunlight);
  return (
    sunlight === 'low' &&
    hasLimitedDirectSunEvidence(product) &&
    hasPositiveIndoorSuitability(product) &&
    isFoliageOrKnownLowLightCategory(product) &&
    !isDirectSunDemanding(product)
  );
}

function matchesNoDirectSun(product) {
  return (
    hasLimitedDirectSunEvidence(product) &&
    hasPositiveIndoorSuitability(product) &&
    isFoliageOrKnownLowLightCategory(product) &&
    !isDirectSunDemanding(product)
  );
}

function matchesDirectSun(product) {
  return isStrongDirectSunMatch(product) && !matchesNoDirectSun(product);
}

function buildBeginnerRiskSearchText(product = {}) {
  const careGuide = product.careGuide || {};
  const schema = product.schema || {};
  const merchant = product.merchant || {};

  return normalizeSearchText([
    getProductDisplayName(product),
    careGuide.plantName,
    careGuide.seoProductName,
    careGuide.scientificName,
    ...valuesOf(careGuide.commonNames),
    careGuide.plantType,
    careGuide.subcategory,
    careGuide.growthHabit,
    schema.name,
    merchant.title,
  ].join(' '));
}

function buildBeginnerSafeSearchText(product = {}) {
  const careGuide = product.careGuide || {};
  const schema = product.schema || {};
  const merchant = product.merchant || {};

  return normalizeSearchText([
    getProductDisplayName(product),
    product.title,
    product.name,
    product.commonName,
    careGuide.plantName,
    careGuide.seoProductName,
    careGuide.scientificName,
    schema.name,
    merchant.title,
  ].join(' '));
}

function matchesBeginner(product, identityText) {
  const difficulty = normalizeSearchText(product?.careGuide?.difficulty);
  const watering = normalizeSearchText(product?.watering);
  const sunlight = normalizeSearchText(product?.sunlight);
  const riskText = buildBeginnerRiskSearchText(product);
  const safeText = buildBeginnerSafeSearchText(product);
  const beginnerText = normalizeSearchText([
    identityText,
    product?.careGuide?.shortDescription,
    product?.careGuide?.bestPlacement,
  ].join(' '));
  const hasBeginnerEvidence =
    difficulty === 'easy' ||
    difficulty === 'easy to moderate' ||
    hasAny(beginnerText, [
      'beginner friendly',
      'easy care',
      'easy to grow',
      'starter plant',
    ]);

  return (
    hasBeginnerEvidence &&
    hasAny(safeText, BEGINNER_SAFE_NAME_PHRASES) &&
    !hasAny(riskText, BEGINNER_RISKY_NAME_PHRASES) &&
    watering !== 'high' &&
    sunlight !== 'high' &&
    !isHighWater(product) &&
    !isHighTransitRisk(product)
  );
}

function hasPositiveIndoorSuitability(product) {
  const suitability = normalizeSearchText(product?.careGuide?.indoorSuitability);
  if (!suitability || suitability.startsWith('conditional')) return false;

  return (
    suitability.startsWith('yes') ||
    hasAny(suitability, [
      'generally suitable',
      'very good',
      'very suitable',
      'suitable indoors',
    ])
  );
}

function matchesIndoor(product) {
  return (
    getBooleanFlag(product, 'indoor') ||
    matchesCategory(product, ['Indoor']) ||
    hasPositiveIndoorSuitability(product)
  );
}

function matchesCactus(product, identityText) {
  return (
    matchesCategory(product, ['Cactus']) ||
    hasWord(identityText, 'cactus') ||
    hasWord(identityText, 'cacti')
  );
}

function matchesDeskPlant(product, identityText) {
  const sizePlacementText = normalizeSearchText([
    identityText,
    getCareText(product, [
      'matureSize',
      'bestPlacement',
      'indoorSuitability',
      'shortDescription',
    ]),
  ].join(' '));
  const hasDeskSize =
    /\b(compact|desk|mini|windowsill)\b/.test(sizePlacementText) ||
    hasAny(sizePlacementText, [
      'desk sized',
      'office desk',
      'small pot',
      'table plant',
      'tabletop',
    ]);

  return hasDeskSize && matchesIndoor(product);
}

function matchesHanging(product, identityText) {
  const careGuide = product.careGuide || {};
  const plantType = normalizeSearchText(careGuide.plantType);
  const subcategory = normalizeSearchText(careGuide.subcategory);
  const growthHabit = normalizeSearchText(careGuide.growthHabit);

  return (
    getBooleanFlag(product, 'hanging') ||
    matchesCategory(product, ['Hanging', 'Creeper']) ||
    hasAny(identityText, ['string of', 'trailing', 'vine', 'vining', 'hanging']) ||
    hasAny(plantType, ['foliage vine', 'hanging plant']) ||
    hasAny(subcategory, ['trailing', 'vine', 'hanging']) ||
    hasAny(growthHabit, ['trailing and cascading', 'trailing vine', 'climbing vine', 'hanging stems'])
  );
}

function matchesMonsoonSafe(product) {
  const category = getProductPublicCategory(product);
  const monsoonText = getCareText(product, [
    'monsoonCare',
    'monsoonWatering',
    'potDrainage',
    'soil',
    'southIndiaNote',
  ]);
  const hasMonsoonHandling =
    hasAny(monsoonText, ['monsoon', 'rain', 'rainy', 'humid', 'wet soil']) &&
    hasAny(monsoonText, ['airflow', 'avoid', 'drain', 'dry', 'protect', 'reduce', 'shelter']);

  return (
    hasMonsoonHandling &&
    !isHighWater(product) &&
    matchesLowWater(product) &&
    HARDY_MONSOON_CATEGORIES.has(category)
  );
}

function matchesGift(product, identityText) {
  return (
    !isHighWater(product) &&
    normalizeSearchText(product?.sunlight) !== 'high' &&
    !isHighTransitRisk(product) &&
    (
      matchesCategory(product, ['Combo']) ||
      matchesDeskPlant(product, identityText) ||
      matchesBeginner(product, identityText)
    )
  );
}

const INTENT_DEFINITIONS = Object.freeze([
  {
    id: 'cactus',
    patterns: [
      /\bcacti\b/i,
      /\bcactus(?:es)?\b/i,
    ],
    matches: matchesCactus,
  },
  {
    id: 'indoor',
    patterns: [
      /\bindoor(?:\s*plant)?\b/i,
      /\binside\s*home\b/i,
      /\bhome\s*plant\b/i,
    ],
    matches: matchesIndoor,
  },
  {
    id: 'low-water',
    patterns: [
      /\blow\s*water(?:ing)?\b/i,
      /\bless\s*water\b/i,
      /\bforget\s*watering\b/i,
      /\bwater\s*less\b/i,
      /\bdrought\b/i,
    ],
    matches: matchesLowWater,
  },
  {
    id: 'moderate-water',
    patterns: [
      /\b(?:moderate|medium)\s*water(?:ing)?\b/i,
      /\bwater(?:ing)?\s*(?:moderate|medium)\b/i,
      /\bregular\s*water(?:ing)?\b/i,
    ],
    matches: matchesModerateWater,
  },
  {
    id: 'high-water',
    patterns: [
      /\b(?:high|heavy)\s*water(?:ing)?\b/i,
      /\bwater(?:ing)?\s*(?:high|heavy)\b/i,
      /\b(?:lots|lot|plenty)\s*of\s*water\b/i,
      /\bthirsty\s*plant\b/i,
    ],
    matches: matchesHighWater,
  },
  {
    id: 'low-light',
    patterns: [
      /\blow\s*(?:light|sun|sunlight)\b/i,
      /\bless\s*(?:light|sun|sunlight)\b/i,
      /\bshade(?:d)?(?:\s*plant)?\b/i,
    ],
    matches: matchesLowLight,
  },
  {
    id: 'no-direct-sun',
    patterns: [
      /\bno\s*direct\s*(?:sun|sunlight)\b/i,
      /\bwithout\s*direct\s*(?:sun|sunlight)\b/i,
      /\bindirect\s*light\b/i,
      /\bfiltered\s*light\b/i,
    ],
    matches: matchesNoDirectSun,
  },
  {
    id: 'direct-sun',
    patterns: [
      /(?<!\bno\s)(?<!without\s)\bdirect\s*(?:sun|sunlight)\b/i,
      /\bfull\s*sun\b/i,
      /\bsunny\s*(?:plant|spot|balcony|window)\b/i,
    ],
    matches: matchesDirectSun,
  },
  {
    id: 'beginner',
    patterns: [
      /\bbeginner(?:\s*friendly)?\b/i,
      /\beasy\s*care\b/i,
      /\beasy\s*to\s*grow\b/i,
      /\bfirst\s*plant\b/i,
      /\bstarter\b/i,
    ],
    matches: matchesBeginner,
  },
  {
    id: 'desk',
    patterns: [
      /\bdesk(?:\s*plant)?\b/i,
      /\boffice(?:\s*plant)?\b/i,
      /\btable(?:\s*plant)?\b/i,
      /\bsmall\s*space\b/i,
      /\bwindowsill\b/i,
    ],
    matches: matchesDeskPlant,
  },
  {
    id: 'hanging',
    patterns: [
      /\bhanging\b/i,
      /\btrailing\b/i,
      /\bcreeper\b/i,
      /\bvine\b/i,
      /\bbasket\b/i,
    ],
    matches: matchesHanging,
  },
  {
    id: 'monsoon',
    patterns: [
      /\bmonsoon(?:\s*safe)?\b/i,
      /\brain(?:y)?\s*safe\b/i,
      /\bhumid(?:ity)?\s*safe\b/i,
    ],
    matches: matchesMonsoonSafe,
  },
  {
    id: 'gift',
    patterns: [
      /\bgift\b/i,
      /\bpresent\b/i,
      /\bbirthday\b/i,
      /\bhamper\b/i,
    ],
    matches: matchesGift,
  },
]);

export function parseShopSearchIntent(rawQuery = '') {
  const maxPrice = extractMaxPrice(rawQuery);
  let intentIds = INTENT_DEFINITIONS
    .filter((definition) => definition.patterns.some((pattern) => pattern.test(rawQuery)))
    .map((definition) => definition.id);
  intentIds = [...new Set(intentIds)];
  if (intentIds.includes('no-direct-sun')) {
    intentIds = intentIds.filter((intentId) => intentId !== 'direct-sun');
  }

  let remainder = stripPatterns(String(rawQuery || ''), PRICE_PATTERNS);
  INTENT_DEFINITIONS.forEach((definition) => {
    remainder = stripPatterns(remainder, definition.patterns);
  });

  const remainingTerms = normalizeSearchText(remainder)
    .split(' ')
    .filter((term) => term && !STOP_WORDS.has(term));

  return {
    intentIds,
    maxPrice,
    normalizedQuery: normalizeSearchText(rawQuery),
    remainingTerms,
  };
}

export function matchesShopSearch(product = {}, rawQuery = '') {
  const parsed = parseShopSearchIntent(rawQuery);
  if (!parsed.normalizedQuery) return true;

  const price = getProductPrice(product);
  if (parsed.maxPrice !== null && (price === null || price > parsed.maxPrice)) {
    return false;
  }

  const identityText = buildShopIdentitySearchText(product);
  const careText = buildShopCareSearchText(product);
  const searchText = normalizeSearchText(`${identityText} ${careText}`);
  const hasDirectMatch =
    identityText.includes(parsed.normalizedQuery) ||
    (parsed.remainingTerms.length > 0 && parsed.remainingTerms.every((term) => searchText.includes(term)));

  if (parsed.intentIds.length === 0 && parsed.maxPrice === null) {
    return hasDirectMatch;
  }

  for (const intentId of parsed.intentIds) {
    const definition = INTENT_DEFINITIONS.find((item) => item.id === intentId);
    if (definition && !definition.matches(product, identityText)) return false;
  }

  if (
    parsed.remainingTerms.length > 0 &&
    !parsed.remainingTerms.every((term) => searchText.includes(term))
  ) {
    return false;
  }

  return true;
}

export function filterProductsForShopSearch(products = [], rawQuery = '') {
  return products.filter((product) => matchesShopSearch(product, rawQuery));
}
