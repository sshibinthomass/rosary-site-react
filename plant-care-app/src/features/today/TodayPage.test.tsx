import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';

import type { CareEvent, CareTask, GrowingLocation, UserPlant } from '../../domain/models';
import type { GardenRepository } from '../../data/gardenRepository';
import { AuthProvider, type AuthDriver } from '../auth/AuthProvider';
import { GardenProvider } from '../garden/GardenProvider';
import TodayPage from './TodayPage';

class TodayRepository implements GardenRepository {
  locations: GrowingLocation[] = [{
    id: 'inside', name: 'Living room', kind: 'indoor', exposure: 'covered', climateZone: 'south', city: 'Bengaluru',
    createdAt: '2026-07-01T08:00:00.000Z', updatedAt: '2026-07-01T08:00:00.000Z',
  }];
  plants: UserPlant[] = [{
    id: 'aloe', speciesId: 'rph-1', nickname: 'Aloe', category: 'succulent', locationId: 'inside', provenance: { kind: 'catalogue' },
    createdAt: '2026-07-01T08:00:00.000Z', updatedAt: '2026-07-01T08:00:00.000Z',
  }];
  tasks: CareTask[] = [{
    id: 'check-1', plantId: 'aloe', action: 'water-check', status: 'open', priority: 'normal', source: 'season-based',
    prompt: 'Check the top 3 cm of soil. Water only if it is dry.', explanation: 'This check follows the monsoon rhythm.',
    earliestAt: '2026-07-14T08:00:00.000Z', latestAt: '2026-07-14T18:00:00.000Z',
    createdAt: '2026-07-01T08:00:00.000Z', updatedAt: '2026-07-01T08:00:00.000Z',
  }];
  events: CareEvent[] = [];
  async listLocations() { return this.locations; }
  async saveLocation(value: GrowingLocation) { this.locations = [value]; }
  async listPlants() { return this.plants; }
  async getPlant(id: string) { return this.plants.find((plant) => plant.id === id); }
  async savePlant(value: UserPlant) { this.plants = [value]; }
  async listTasks() { return this.tasks; }
  async saveTask(value: CareTask) { this.tasks = [...this.tasks.filter((task) => task.id !== value.id), value]; }
  async listEvents() { return this.events; }
  async appendEvent(value: CareEvent) { this.events.push(value); }
  async clearGuestData() {}
}

it('records a moist-soil observation and shows the next check', async () => {
  const user = userEvent.setup();
  const authDriver: AuthDriver = {
    subscribe(callback) { callback(null); return () => undefined; },
    async popup() {}, async redirect() {}, async native() {}, async signOut() {}, isNative: false,
  };
  render(
    <AuthProvider driver={authDriver}>
      <GardenProvider repository={new TodayRepository()} now={() => new Date('2026-07-14T08:00:00.000Z')} weatherProvider={null}>
        <TodayPage />
      </GardenProvider>
    </AuthProvider>,
  );

  expect(await screen.findByRole('heading', { name: 'Today' })).toBeVisible();
  expect(screen.getByText(/check the top 3 cm/i)).toBeVisible();
  await user.click(screen.getByRole('button', { name: /soil is still moist/i }));
  expect(await screen.findByText(/next check/i)).toBeVisible();
});
