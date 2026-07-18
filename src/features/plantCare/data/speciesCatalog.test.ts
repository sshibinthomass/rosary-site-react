import { expect, it } from 'vitest';

import { searchSpecies } from './speciesCatalog';

it('shows one care profile when several shop products share the same plant name', () => {
  const aloeProfiles = searchSpecies('Aloe vera').filter((profile) => profile.name === 'Aloe Vera');
  expect(aloeProfiles).toHaveLength(1);
});
