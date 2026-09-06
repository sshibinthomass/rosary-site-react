/**
 * Care inference.
 *
 * The redesigned plant page shows compact, scannable care facts — three-step
 * "how needy is it" bars, a season-by-season watering cadence, plain verdicts
 * on where a plant will actually survive, and comfort/size tiles. The catalogue
 * only stores prose, so these helpers read that prose and derive the compact
 * values. Everything degrades to a safe default when the prose is missing.
 */

const LEVEL_LABELS = Object.freeze({ 1: 'Low', 2: 'Medium', 3: 'High' });

function text(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function careOf(product) {
  return product?.careGuide || {};
}

/** Normalizes the catalogue's care words to a 1-3 step. */
export function careLevelFromWord(value) {
  const word = text(value);
  if (!word) return null;
  if (/^very low\b/.test(word) || /^low\b/.test(word)) return 1;
  if (/^(moderate|medium|mid)\b/.test(word)) return 2;
  if (/^(high|very high)\b/.test(word)) return 3;
  return null;
}

export function getWaterLevel(product = {}) {
  const direct = careLevelFromWord(product.watering);
  if (direct) return direct;

  const prose = text([careOf(product).watering, careOf(product).summerWatering].join(' '));
  if (!prose) return 2;
  if (/(dry (out )?(almost )?(completely|fully)|sparingly|infrequent|drought|soak and dry)/.test(prose)) return 1;
  if (/(evenly moist|never fully dry|keep moist|frequent)/.test(prose)) return 3;
  return 2;
}

export function getLightLevel(product = {}) {
  const direct = careLevelFromWord(product.sunlight);
  if (direct) return direct;

  const prose = text([careOf(product).sunlight, careOf(product).directSunTolerance].join(' '));
  if (!prose) return 2;
  if (/(full sun|several hours of direct|4-6 hours|strong direct)/.test(prose)) return 3;
  if (/(bright shade|indirect|filtered|low light)/.test(prose)) return 1;
  return 2;
}

export function getHumidityLevel(product = {}) {
  const prose = text(careOf(product).humidity);
  if (!prose) return 2;
  if (/^(prefers |likes |needs |wants )?(very )?high humidity/.test(prose) || /高/.test(prose)) return 3;
  if (/\bhigh humidity is (best|preferred|ideal)\b/.test(prose)) return 3;
  if (/\blow\b/.test(prose)) return 1;
  if (/\bmoderate\b/.test(prose)) return 2;
  return 2;
}

export function getEffortLevel(product = {}) {
  const difficulty = text(careOf(product).difficulty);
  if (!difficulty) return 2;
  if (/^easy$/.test(difficulty)) return 1;
  if (/^(hard|difficult|advanced|demanding)/.test(difficulty)) return 3;
  if (/moderate to (hard|difficult)/.test(difficulty)) return 3;
  return 2;
}

export function getEffortLabel(product = {}) {
  const difficulty = careOf(product).difficulty;
  const level = getEffortLevel(product);
  if (!difficulty) return LEVEL_LABELS[level];
  if (/^easy to moderate$/i.test(String(difficulty).trim())) return 'Easy–Moderate';
  return String(difficulty).trim();
}

/**
 * The four "How needy is it?" rows.
 * Each row is { id, label, level (1-3), value, icon, tone }.
 */
export function buildCareIntensity(product = {}) {
  const water = getWaterLevel(product);
  const light = getLightLevel(product);
  const humidity = getHumidityLevel(product);
  const effort = getEffortLevel(product);

  return [
    { id: 'water', label: 'Water', icon: 'droplet', tone: 'sage', level: water, value: LEVEL_LABELS[water] },
    { id: 'light', label: 'Light', icon: 'sun', tone: 'accent', level: light, value: LEVEL_LABELS[light] },
    { id: 'humidity', label: 'Humidity', icon: 'humidity', tone: 'sage', level: humidity, value: LEVEL_LABELS[humidity] },
    { id: 'effort', label: 'Effort', icon: 'leaf', tone: 'sage', level: effort, value: getEffortLabel(product) },
  ];
}

function dayRange(prose) {
  const normalized = text(prose).replace(/[–—]/g, '-');

  const range = normalized.match(/(\d+)\s*-\s*(\d+)\s*days?/);
  if (range) return `${range[1]}–${range[2]}`;

  const single = normalized.match(/every\s*(\d+)\s*days?/);
  if (single) return single[1];

  const fortnight = /\bfortnight\b/.test(normalized) ? '14' : null;
  if (fortnight) return fortnight;

  const weekly = /\b(once a week|weekly)\b/.test(normalized) ? '7' : null;
  if (weekly) return weekly;

  return null;
}

function seasonCell(prose, { sparingLabel, sparingNote }) {
  const days = dayRange(prose);
  if (days) return { value: days, note: 'days apart' };

  const normalized = text(prose);
  if (!normalized) return { value: 'Check', note: 'feel the soil' };
  if (/(rarely|barely|very little|not at all|stop watering|hardly)/.test(normalized)) {
    return { value: 'Barely', note: 'keep it dry' };
  }
  if (/(reduce|cut back|less often|sparing|sharply|minimal|protect)/.test(normalized)) {
    return { value: sparingLabel, note: sparingNote };
  }
  return { value: 'Check', note: 'feel the soil' };
}

/**
 * Summer / monsoon / winter watering cadence for the seasonal tiles.
 * Returns { seasons: [{id,label,value,note}], summary }.
 */
export function buildWateringYear(product = {}) {
  const care = careOf(product);

  const seasons = [
    {
      id: 'summer',
      label: 'Summer',
      ...seasonCell(care.summerWatering, { sparingLabel: 'Less', sparingNote: 'water sparingly' }),
    },
    {
      id: 'monsoon',
      label: 'Monsoon',
      ...seasonCell(care.monsoonWatering, { sparingLabel: 'Barely', sparingNote: 'keep it dry' }),
    },
    {
      id: 'winter',
      label: 'Winter',
      ...seasonCell(care.winterWatering, { sparingLabel: 'Less', sparingNote: 'water sparingly' }),
    },
  ];

  const summary = care.watering
    || 'Water well, then let the mix dry before watering again.';

  return { seasons, summary };
}

function suitabilityVerdict(prose, { yes, conditional, no }) {
  const normalized = text(prose);
  if (!normalized) return null;
  if (/^no\b/.test(normalized) || /\bnot suitable\b/.test(normalized)) {
    return { verdict: no, tone: 'no' };
  }
  if (/^(conditional|maybe|sometimes)\b/.test(normalized) || /\bonly if\b/.test(normalized)) {
    return { verdict: conditional, tone: 'maybe' };
  }
  if (/^yes\b/.test(normalized) || /\b(very )?(suitable|good)\b/.test(normalized)) {
    return { verdict: yes, tone: 'yes' };
  }
  return { verdict: conditional, tone: 'maybe' };
}

/** Strips a leading "Yes, " / "Conditional; " so the note reads as a sentence. */
function suitabilityNote(prose, fallback) {
  const raw = String(prose ?? '').trim();
  if (!raw) return fallback;
  const stripped = raw.replace(/^(yes|no|conditional)\b[\s,;:—-]*/i, '').trim();
  const note = stripped || raw;
  return note.charAt(0).toUpperCase() + note.slice(1);
}

function monsoonVerdict(product) {
  const prose = text([careOf(product).monsoonCare, careOf(product).monsoonWatering].join(' '));
  const water = getWaterLevel(product);

  if (/(handles rain|tolerates rain|enjoys the rain|fine in rain)/.test(prose)) {
    return { verdict: 'Yes', tone: 'yes', note: 'Copes with regular rain' };
  }
  if (/(shelter|protect|keep .*dry|avoid .*rain|cover|move .*under)/.test(prose) || water === 1) {
    return { verdict: 'No', tone: 'no', note: 'Constant wet soil is what kills it' };
  }
  return { verdict: 'Only sheltered', tone: 'maybe', note: 'Keep it out of days of standing wet' };
}

/**
 * "Will it live at your place?" — three plain verdicts a buyer can act on.
 * Each entry is { id, icon, label, note, verdict, tone: 'yes' | 'maybe' | 'no' }.
 */
export function buildPlacementVerdicts(product = {}) {
  const care = careOf(product);

  const balcony = suitabilityVerdict(care.balconySuitability, {
    yes: 'Yes',
    conditional: 'Only if bright',
    no: 'No',
  }) || { verdict: 'Likely', tone: 'maybe' };

  const indoors = suitabilityVerdict(care.indoorSuitability, {
    yes: 'Yes',
    conditional: 'Only if sunny',
    no: 'No',
  }) || { verdict: 'Only if sunny', tone: 'maybe' };

  const monsoon = monsoonVerdict(product);

  return [
    {
      id: 'balcony',
      icon: 'balcony',
      label: 'Bright balcony',
      note: suitabilityNote(care.balconySuitability, care.bestPlacement || 'Bright, airy and rain-protected'),
      verdict: balcony.verdict,
      tone: balcony.tone,
    },
    {
      id: 'indoors',
      icon: 'indoors',
      label: 'Indoors',
      note: suitabilityNote(care.indoorSuitability, 'Needs a strong, sunny window'),
      verdict: indoors.verdict,
      tone: indoors.tone,
    },
    {
      id: 'monsoon',
      icon: 'rain',
      label: 'Open to monsoon rain',
      note: monsoon.note,
      verdict: monsoon.verdict,
      tone: monsoon.tone,
    },
  ];
}

/** "12–35°C" from the temperature prose. */
export function getComfortRange(product = {}) {
  const prose = String(careOf(product).temperature ?? '').replace(/[–—]/g, '-');
  const range = prose.match(/(\d+)\s*-\s*(\d+)\s*°?\s*C/i);
  if (range) return `${range[1]}–${range[2]}°C`;

  const single = prose.match(/(\d+)\s*°?\s*C/i);
  if (single) return `${single[1]}°C`;

  return null;
}

/**
 * "10–15 cm" from the mature-size prose.
 *
 * Roughly half the catalogue describes size qualitatively rather than in
 * centimetres, so shape words fall back to a short habit summary instead of
 * leaving the tile blank.
 */
export function getMatureSizeSummary(product = {}) {
  const prose = String(careOf(product).matureSize ?? '').replace(/[–—]/g, '-');
  const range = prose.match(/(\d+)\s*-\s*(\d+)\s*(cm|m|ft|in)\b/i);
  if (range) return `${range[1]}–${range[2]} ${range[3].toLowerCase()}`;

  const single = prose.match(/(\d+)\s*(cm|m|ft|in)\b/i);
  if (single) return `${single[1]} ${single[2].toLowerCase()}`;

  // The size sentence is the trustworthy source. Fall back to growthHabit only
  // when it names one habit — many rows carry a catch-all listing every option.
  const growthHabit = String(careOf(product).growthHabit ?? '');
  const isCatchAllHabit = / or /i.test(growthHabit);
  return habitSummary(prose) || (isCatchAllHabit ? null : habitSummary(growthHabit));
}

function habitSummary(value) {
  const habit = text(value);
  if (!habit) return null;
  if (/(trail|spill|cascad|climb|hang)/.test(habit)) return 'Trails';
  if (/(upright|shrub|branching|taller|columnar)/.test(habit)) return 'Grows upright';
  if (/(low|broad|mat)[a-z\s-]*(clump|mound|spread)/.test(habit)) return 'Low clump';
  if (/(clump|cluster|head|mound|offset|rosette)/.test(habit)) return 'Clumps';
  if (/(compact|small|manageable|stays low)/.test(habit)) return 'Stays compact';
  if (/(spread|broad|wide)/.test(habit)) return 'Spreads wide';
  return null;
}

/**
 * The two small facts beside the placement list.
 * Returns [{ id, label, value }] with unresolved facts dropped.
 */
export function buildPlantFacts(product = {}) {
  const comfort = getComfortRange(product);
  const size = getMatureSizeSummary(product);

  return [
    comfort ? { id: 'comfort', label: 'Comfort range', value: comfort } : null,
    size ? { id: 'size', label: 'Grows to', value: size } : null,
  ].filter(Boolean);
}

const READ_MORE_SECTION_BLURBS = Object.freeze({
  'plant-profile': 'Habit, mature size and what it looks like on the bench',
  'placement-light': 'Where it wants to sit and how much sun it can take',
  'watering-seasons': 'The watering rhythm through the Indian year',
  'soil-climate': 'Soil, drainage, temperature and humidity',
  'maintenance-propagation': 'Feeding, pruning, repotting and propagation',
  'seasonal-care': 'What changes each season',
  'india-notes': 'South India and North India notes',
  'common-problems': 'Soft stems, wrinkling, leggy growth, sunburn, pests, root rot',
  'recovery-tips': 'Bringing a struggling plant back',
});

/** One-line summaries used by the "Read more" accordion rows. */
export function getCareSectionBlurb(section = {}) {
  if (READ_MORE_SECTION_BLURBS[section.id]) return READ_MORE_SECTION_BLURBS[section.id];

  const firstItem = Array.isArray(section.items) ? section.items[0] : null;
  if (firstItem?.value) {
    const sentence = String(firstItem.value).split('.')[0];
    return sentence ? `${sentence.trim()}.` : '';
  }
  return '';
}

/**
 * "Start with your spot" — the three condition entries on the home page.
 * Each carries the shop search that produces its list, so the counts and the
 * destination can never drift apart.
 */
export const SPOT_ENTRIES = Object.freeze([
  {
    id: 'bright-balcony',
    icon: 'sun',
    title: 'Bright balcony, direct sun',
    query: 'direct sun',
    describe: (names) => `${names} — sun lovers`,
  },
  {
    id: 'indoors',
    icon: 'indoors',
    title: 'Indoors, near a window',
    query: 'indoor',
    describe: (names) => `${names} — happy inside`,
  },
  {
    id: 'forgetful',
    icon: 'droplet',
    title: 'I forget to water',
    query: 'low water',
    describe: () => 'Every plant here survives a fortnight dry',
  },
]);
