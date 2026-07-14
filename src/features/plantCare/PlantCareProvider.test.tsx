import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import type { GardenRepository } from './data/gardenRepository';
import { PlantCareProvider, usePlantCare } from './PlantCareProvider';

function Probe() {
  const garden = usePlantCare();
  return <p>{garden.loading ? 'loading' : `${garden.locations[0]?.name}:${garden.syncState}`}</p>;
}

it('opens the local garden without requiring a second account provider', async () => {
  const repository = {
    listLocations: vi.fn().mockResolvedValue([{ id: 'inside', name: 'Living room', kind: 'indoor', city: 'Bengaluru', climateZone: 'south', createdAt: '2026-07-14', updatedAt: '2026-07-14' }]),
    listPlants: vi.fn().mockResolvedValue([]),
    listTasks: vi.fn().mockResolvedValue([]),
    listEvents: vi.fn().mockResolvedValue([]),
    listPhotos: vi.fn().mockResolvedValue([]),
    saveLocation: vi.fn(), savePlant: vi.fn(), saveTask: vi.fn(), appendEvent: vi.fn(), savePhoto: vi.fn(), getPlant: vi.fn(),
  } as unknown as GardenRepository;

  render(<PlantCareProvider user={null} repository={repository} weatherProvider={null}><Probe /></PlantCareProvider>);

  expect(await screen.findByText('Living room:local')).toBeVisible();
});
