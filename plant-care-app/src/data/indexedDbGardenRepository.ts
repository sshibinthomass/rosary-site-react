import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type { CareEvent, CareTask, GrowingLocation, UserPlant } from '../domain/models';
import type { GardenRepository } from './gardenRepository';

interface PlantCareDatabase extends DBSchema {
  locations: { key: string; value: GrowingLocation };
  plants: { key: string; value: UserPlant };
  tasks: { key: string; value: CareTask; indexes: { 'by-plant': string; 'by-status': string } };
  events: { key: string; value: CareEvent; indexes: { 'by-plant': string; 'by-date': string } };
  photos: { key: string; value: { id: string; plantId: string; blob: Blob; createdAt: string }; indexes: { 'by-plant': string } };
}

function openGardenDatabase() {
  return openDB<PlantCareDatabase>('rosary-plant-care', 1, {
    upgrade(database) {
      database.createObjectStore('locations', { keyPath: 'id' });
      database.createObjectStore('plants', { keyPath: 'id' });
      const tasks = database.createObjectStore('tasks', { keyPath: 'id' });
      tasks.createIndex('by-plant', 'plantId');
      tasks.createIndex('by-status', 'status');
      const events = database.createObjectStore('events', { keyPath: 'id' });
      events.createIndex('by-plant', 'plantId');
      events.createIndex('by-date', 'occurredAt');
      const photos = database.createObjectStore('photos', { keyPath: 'id' });
      photos.createIndex('by-plant', 'plantId');
    },
  });
}

export class IndexedDbGardenRepository implements GardenRepository {
  private database: Promise<IDBPDatabase<PlantCareDatabase>>;

  constructor(database = openGardenDatabase()) {
    this.database = database;
  }

  async listLocations() { return (await this.database).getAll('locations'); }
  async saveLocation(location: GrowingLocation) { await (await this.database).put('locations', location); }
  async listPlants() { return (await this.database).getAll('plants'); }
  async getPlant(id: string) { return (await this.database).get('plants', id); }
  async savePlant(plant: UserPlant) { await (await this.database).put('plants', plant); }
  async listTasks() { return (await this.database).getAll('tasks'); }
  async saveTask(task: CareTask) { await (await this.database).put('tasks', task); }
  async listEvents(plantId?: string) {
    const database = await this.database;
    return plantId ? database.getAllFromIndex('events', 'by-plant', plantId) : database.getAll('events');
  }
  async appendEvent(event: CareEvent) { await (await this.database).add('events', event); }

  async clearGuestData() {
    const database = await this.database;
    const transaction = database.transaction(['locations', 'plants', 'tasks', 'events', 'photos'], 'readwrite');
    await Promise.all([
      transaction.objectStore('locations').clear(),
      transaction.objectStore('plants').clear(),
      transaction.objectStore('tasks').clear(),
      transaction.objectStore('events').clear(),
      transaction.objectStore('photos').clear(),
      transaction.done,
    ]);
  }
}
