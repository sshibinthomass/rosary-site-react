import { beforeEach, describe, expect, it } from 'vitest';

import type { CareEvent, CareTask, GrowingLocation, UserPlant } from '../../domain/models';
import type { GardenRepository } from '../../data/gardenRepository';
import { GardenLimitError, GardenService } from './GardenService';

class MemoryGardenRepository implements GardenRepository {
  locations: GrowingLocation[] = [];
  plants: UserPlant[] = [];
  tasks: CareTask[] = [];
  events: CareEvent[] = [];

  async listLocations() { return structuredClone(this.locations); }
  async saveLocation(location: GrowingLocation) { this.locations = upsert(this.locations, location); }
  async listPlants() { return structuredClone(this.plants); }
  async getPlant(id: string) { return structuredClone(this.plants.find((plant) => plant.id === id)); }
  async savePlant(plant: UserPlant) { this.plants = upsert(this.plants, plant); }
  async listTasks() { return structuredClone(this.tasks); }
  async saveTask(task: CareTask) { this.tasks = upsert(this.tasks, task); }
  async listEvents(plantId?: string) { return structuredClone(plantId ? this.events.filter((event) => event.plantId === plantId) : this.events); }
  async appendEvent(event: CareEvent) { this.events.push(structuredClone(event)); }
  async clearGuestData() { this.locations = []; this.plants = []; this.tasks = []; this.events = []; }
}

function upsert<T extends { id: string }>(items: T[], value: T) {
  return [...items.filter((item) => item.id !== value.id), structuredClone(value)];
}

const now = new Date('2026-07-14T08:00:00.000Z');
const location: GrowingLocation = {
  id: 'inside',
  name: 'Living room',
  kind: 'indoor',
  exposure: 'covered',
  climateZone: 'south',
  city: 'Bengaluru',
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

describe('GardenService', () => {
  let repo: MemoryGardenRepository;
  let service: GardenService;

  beforeEach(async () => {
    repo = new MemoryGardenRepository();
    let id = 0;
    service = new GardenService(repo, () => now, () => `fixed-${++id}`);
    await repo.saveLocation(location);
  });

  it('adds a plant, appends plant_created, and creates a first water check', async () => {
    const plant = await service.addPlant({
      speciesId: 'rph-1',
      nickname: 'Aloe',
      category: 'succulent',
      locationId: location.id,
      provenance: { kind: 'catalogue' },
    });

    expect(await repo.listPlants()).toContainEqual(expect.objectContaining({ id: plant.id }));
    expect((await repo.listEvents(plant.id))[0].type).toBe('plant_created');
    const firstTask = (await repo.listTasks()).find((task) => task.action === 'water-check');
    expect(firstTask).toBeDefined();
    expect(firstTask?.earliestAt).toBe(now.toISOString());
  });

  it('records not-needed and reschedules instead of marking watered', async () => {
    const plant = await service.addPlant({
      speciesId: 'rph-1', nickname: 'Aloe', category: 'succulent', locationId: location.id, provenance: { kind: 'catalogue' },
    });
    const task = (await repo.listTasks())[0];
    await service.completeTask(task.id, 'not-needed');

    const events = await repo.listEvents(plant.id);
    expect(events.at(-1)?.type).toBe('checked_not_needed');
    expect((await repo.listTasks()).some((next) => next.status === 'open')).toBe(true);
    expect((await repo.listTasks()).filter((next) => next.id === task.id)[0].status).toBe('completed');
  });

  it('limits guests to ten non-Rosary plants but never counts verified Rosary plants', async () => {
    for (let index = 0; index < 10; index += 1) {
      await service.addPlant({
        nickname: `Plant ${index}`, category: 'houseplant', locationId: location.id, provenance: { kind: 'custom' },
      });
    }
    await expect(service.addPlant({
      nickname: 'Plant 11', category: 'houseplant', locationId: location.id, provenance: { kind: 'custom' },
    })).rejects.toBeInstanceOf(GardenLimitError);
    await expect(service.addPlant({
      speciesId: 'rph-99', nickname: 'Rosary plant', category: 'houseplant', locationId: location.id, provenance: { kind: 'rosary', orderId: 'order-1' },
    })).resolves.toEqual(expect.objectContaining({ nickname: 'Rosary plant' }));
  });

  it('allows one indoor and one balcony location', async () => {
    await expect(service.addLocation({ name: 'Bedroom', kind: 'indoor', exposure: 'covered', climateZone: 'south', city: 'Bengaluru' }))
      .rejects.toBeInstanceOf(GardenLimitError);
    await expect(service.addLocation({ name: 'Balcony', kind: 'balcony', exposure: 'exposed', climateZone: 'south', city: 'Bengaluru' }))
      .resolves.toEqual(expect.objectContaining({ kind: 'balcony' }));
  });
});
