import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSpeciesCatalog } from './build-species-catalog.mjs';

test('publishes only verified care profiles with stable IDs', () => {
  const result = buildSpeciesCatalog([
    {
      id: '1',
      identityVerified: true,
      seoStatus: 'published',
      careGuide: {
        plantName: 'Aloe vera',
        scientificName: 'Aloe vera',
        plantType: 'Succulent',
        watering: 'Allow the mix to dry well.',
      },
    },
    {
      id: '2',
      identityVerified: false,
      seoStatus: 'published',
      careGuide: { plantName: 'Unknown' },
    },
  ]);

  assert.deepEqual(
    result.map(({ id, name, category }) => ({ id, name, category })),
    [{ id: 'rph-1', name: 'Aloe vera', category: 'succulent' }],
  );
});

test('sorts profiles by name and maps balcony plants', () => {
  const result = buildSpeciesCatalog([
    {
      id: '20',
      identityVerified: true,
      seoStatus: 'published',
      careGuide: { plantName: 'Zinnia', plantType: 'Flowering Plant', balconySuitability: 'Excellent' },
    },
    {
      id: '10',
      identityVerified: true,
      seoStatus: 'published',
      careGuide: { plantName: 'Areca Palm', plantType: 'Indoor Plant' },
    },
  ]);

  assert.deepEqual(result.map(({ name, category }) => ({ name, category })), [
    { name: 'Areca Palm', category: 'houseplant' },
    { name: 'Zinnia', category: 'balcony' },
  ]);
});
