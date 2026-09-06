import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  SPOT_ENTRIES,
  buildCareIntensity,
  buildPlacementVerdicts,
  buildPlantFacts,
  buildWateringYear,
  careLevelFromWord,
  getCareSectionBlurb,
  getComfortRange,
  getEffortLabel,
  getMatureSizeSummary,
} from '../src/utils/careInference.js';

const products = JSON.parse(fs.readFileSync('src/data/products.json', 'utf8'));
const byId = new Map(products.map((product) => [String(product.id), product]));

test('care words map onto the three-step scale the bars render', () => {
  assert.equal(careLevelFromWord('Low'), 1);
  assert.equal(careLevelFromWord('Very Low'), 1);
  assert.equal(careLevelFromWord('Moderate'), 2);
  assert.equal(careLevelFromWord('Medium'), 2);
  assert.equal(careLevelFromWord('High'), 3);
  assert.equal(careLevelFromWord('Not Specific'), null);
  assert.equal(careLevelFromWord(''), null);
  assert.equal(careLevelFromWord(undefined), null);
});

test('care intensity always produces the four rows the design shows', () => {
  const intensity = buildCareIntensity(byId.get('1'));

  assert.deepEqual(intensity.map((row) => row.id), ['water', 'light', 'humidity', 'effort']);
  for (const row of intensity) {
    assert.ok(row.level >= 1 && row.level <= 3, `${row.id} level out of range`);
    assert.ok(row.value, `${row.id} needs a readable value`);
    assert.ok(row.icon, `${row.id} needs an icon`);
  }
});

test('care intensity reads the catalogue words before falling back to prose', () => {
  const [water, light] = buildCareIntensity({
    watering: 'Low',
    sunlight: 'High',
    careGuide: { humidity: 'Prefers low to moderate humidity with good airflow.', difficulty: 'Easy' },
  });

  assert.equal(water.level, 1);
  assert.equal(water.value, 'Low');
  assert.equal(light.level, 3);
  assert.equal(light.value, 'High');
});

test('humidity and effort are inferred from prose the catalogue only writes out', () => {
  const dryEasy = buildCareIntensity({
    careGuide: { humidity: 'Low humidity is preferred; high humidity needs stronger airflow.', difficulty: 'Easy' },
  });
  assert.equal(dryEasy[2].level, 1);
  assert.equal(dryEasy[3].level, 1);
  assert.equal(dryEasy[3].value, 'Easy');

  const humidModerate = buildCareIntensity({
    careGuide: { humidity: 'Moderate humidity is fine if airflow stays good.', difficulty: 'Easy to Moderate' },
  });
  assert.equal(humidModerate[2].level, 2);
  assert.equal(humidModerate[3].level, 2);
  assert.equal(humidModerate[3].value, 'Easy–Moderate');
});

test('effort label keeps the catalogue wording readable', () => {
  assert.equal(getEffortLabel({ careGuide: { difficulty: 'Easy to Moderate' } }), 'Easy–Moderate');
  assert.equal(getEffortLabel({ careGuide: { difficulty: 'Easy' } }), 'Easy');
  assert.equal(getEffortLabel({}), 'Medium');
});

test('watering by season pulls day ranges out of the care prose', () => {
  const { seasons, summary } = buildWateringYear({
    careGuide: {
      watering: 'Water thoroughly, then wait for the mix to dry almost fully.',
      summerWatering: 'About once every 5-7 days in heat, depending on pot size and drainage.',
      monsoonWatering: 'Reduce watering sharply and protect from constant rain splash.',
      winterWatering: 'Water sparingly every 10-15 days if the mix stays dry.',
    },
  });

  assert.deepEqual(seasons.map((season) => season.value), ['5–7', 'Barely', '10–15']);
  assert.deepEqual(seasons.map((season) => season.note), ['days apart', 'keep it dry', 'days apart']);
  assert.match(summary, /dry almost fully/);
});

test('watering by season degrades to readable text when no cadence is written down', () => {
  const { seasons, summary } = buildWateringYear({});

  assert.deepEqual(seasons.map((season) => season.id), ['summer', 'monsoon', 'winter']);
  for (const season of seasons) {
    assert.ok(season.value, `${season.id} needs a value`);
    assert.ok(season.note, `${season.id} needs a note`);
  }
  assert.match(summary, /Water well/);
});

test('every catalogue plant yields three seasonal cells that are safe to render', () => {
  for (const product of products) {
    const { seasons } = buildWateringYear(product);
    assert.equal(seasons.length, 3, `product ${product.id} lost a season`);
    for (const season of seasons) {
      assert.equal(typeof season.value, 'string');
      assert.ok(season.value.length > 0 && season.value.length <= 12, `product ${product.id} ${season.id} value "${season.value}" will not fit the tile`);
    }
  }
});

test('placement verdicts turn suitability prose into a plain yes / maybe / no', () => {
  const verdicts = buildPlacementVerdicts({
    watering: 'Low',
    careGuide: {
      balconySuitability: 'Yes; very suitable for bright balconies with airflow.',
      indoorSuitability: 'Conditional; only near a very bright window with direct light.',
      monsoonCare: 'Keep the rosette from staying wet for days and shelter from heavy rain.',
    },
  });

  assert.deepEqual(verdicts.map((row) => row.id), ['balcony', 'indoors', 'monsoon']);
  assert.equal(verdicts[0].tone, 'yes');
  assert.equal(verdicts[1].tone, 'maybe');
  assert.equal(verdicts[1].verdict, 'Only if sunny');
  assert.equal(verdicts[2].tone, 'no');
  assert.equal(verdicts[2].verdict, 'No');
});

test('placement notes drop the leading verdict word so they read as sentences', () => {
  const [balcony] = buildPlacementVerdicts({
    careGuide: { balconySuitability: 'Yes, if protected from heavy rain.' },
  });

  assert.equal(balcony.note, 'If protected from heavy rain.');
});

test('every catalogue plant yields three placement verdicts with a tone the UI can colour', () => {
  const tones = new Set(['yes', 'maybe', 'no']);

  for (const product of products) {
    const verdicts = buildPlacementVerdicts(product);
    assert.equal(verdicts.length, 3, `product ${product.id} lost a placement row`);
    for (const row of verdicts) {
      assert.ok(tones.has(row.tone), `product ${product.id} ${row.id} has tone ${row.tone}`);
      assert.ok(row.verdict, `product ${product.id} ${row.id} needs a verdict`);
      assert.ok(row.note, `product ${product.id} ${row.id} needs a note`);
    }
  }
});

test('comfort range and mature size are parsed out of the care prose', () => {
  assert.equal(
    getComfortRange({ careGuide: { temperature: 'Best in mild to warm conditions, roughly 10-32 C.' } }),
    '10–32°C'
  );
  assert.equal(
    getComfortRange({ careGuide: { temperature: 'Comfortable around 12-34 C.' } }),
    '12–34°C'
  );
  assert.equal(getComfortRange({}), null);

  assert.equal(
    getMatureSizeSummary({ careGuide: { matureSize: 'Usually 8-15 cm tall with offsets spreading wider over time.' } }),
    '8–15 cm'
  );
  assert.equal(
    getMatureSizeSummary({ careGuide: { matureSize: 'Usually stays compact in a pot and broadens slowly with age.' } }),
    'Stays compact'
  );
  assert.equal(getMatureSizeSummary({}), null);
});

test('a qualitative size sentence still yields a habit summary', () => {
  assert.equal(
    getMatureSizeSummary({ careGuide: { matureSize: 'Usually forms a soft trailing mound that can spill from the pot.' } }),
    'Trails'
  );
  assert.equal(
    getMatureSizeSummary({ careGuide: { matureSize: 'Usually forms a broad low clump in containers.' } }),
    'Low clump'
  );
  assert.equal(
    getMatureSizeSummary({ careGuide: { matureSize: 'Can become a taller branching plant in containers over time.' } }),
    'Grows upright'
  );
});

test('a catch-all growth habit never overrides the size sentence', () => {
  // Many rows carry "Compact, clumping, trailing, or rosette-forming succulent
  // habit." — reading "trailing" out of that would mislabel every rosette.
  assert.equal(
    getMatureSizeSummary({
      careGuide: {
        matureSize: 'Usually stays compact in a pot and broadens slowly with age.',
        growthHabit: 'Compact, clumping, trailing, or rosette-forming succulent habit.',
      },
    }),
    'Stays compact'
  );
});

test('plant facts drop entries that cannot be derived instead of showing blanks', () => {
  assert.deepEqual(buildPlantFacts({}), []);

  const facts = buildPlantFacts({
    careGuide: { temperature: 'Best around 12-35 C.', matureSize: 'Usually 10-15 cm tall.' },
  });
  assert.deepEqual(facts.map((fact) => fact.label), ['Comfort range', 'Grows to']);
  assert.deepEqual(facts.map((fact) => fact.value), ['12–35°C', '10–15 cm']);
});

test('the whole catalogue resolves both plant facts', () => {
  const unresolved = products.filter((product) => buildPlantFacts(product).length !== 2);
  assert.deepEqual(
    unresolved.map((product) => product.id),
    [],
    'every plant should resolve a comfort range and a size summary'
  );
});

test('care section blurbs cover the sections the read-more rows render', () => {
  for (const id of [
    'plant-profile',
    'placement-light',
    'watering-seasons',
    'soil-climate',
    'maintenance-propagation',
    'seasonal-care',
    'india-notes',
    'common-problems',
    'recovery-tips',
  ]) {
    assert.ok(getCareSectionBlurb({ id }), `${id} needs a blurb`);
  }

  assert.equal(
    getCareSectionBlurb({ id: 'unknown', items: [{ value: 'First sentence here. Second one.' }] }),
    'First sentence here.'
  );
});

test('the home page spot entries carry the shop query that produces their list', () => {
  assert.equal(SPOT_ENTRIES.length, 3);
  for (const entry of SPOT_ENTRIES) {
    assert.ok(entry.id && entry.title && entry.icon, 'spot entry is incomplete');
    assert.ok(entry.query, `${entry.id} needs a shop query`);
    assert.equal(typeof entry.describe, 'function');
  }
  assert.deepEqual(SPOT_ENTRIES.map((entry) => entry.query), ['direct sun', 'indoor', 'low water']);
});
