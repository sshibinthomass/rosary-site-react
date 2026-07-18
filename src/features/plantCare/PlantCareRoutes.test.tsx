import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it, vi } from 'vitest';

import type { GardenRepository } from './data/gardenRepository';
import { PlantCareRoutes } from './PlantCareFeature';

function emptyRepository() {
  return {
    listLocations: vi.fn().mockResolvedValue([]),
    listPlants: vi.fn().mockResolvedValue([]),
    listTasks: vi.fn().mockResolvedValue([]),
    listEvents: vi.fn().mockResolvedValue([]),
    listPhotos: vi.fn().mockResolvedValue([]),
    saveLocation: vi.fn(),
    savePlant: vi.fn(),
    saveTask: vi.fn(),
    appendEvent: vi.fn(),
    savePhoto: vi.fn(),
    getPlant: vi.fn(),
    clearGuestData: vi.fn(),
  } as unknown as GardenRepository;
}

it('renders the care desk inside Rosary with one in-content section navigation', async () => {
  render(
    <MemoryRouter initialEntries={['/care']}>
      <Routes>
        <Route path="/care/*" element={<PlantCareRoutes user={null} repository={emptyRepository()} />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Today' })).toBeVisible();
  const careNavigation = screen.getByRole('navigation', { name: 'Plant Care sections' });
  expect(careNavigation).toBeVisible();
  expect(screen.getByRole('link', { name: 'My Garden' })).toHaveAttribute('href', '/care/garden');
  expect(screen.getByRole('link', { name: 'Add plant' })).toHaveAttribute('href', '/care/add');
  expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument();
});
