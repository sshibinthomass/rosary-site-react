import type { CareEvent, CareTask, GrowingLocation, PlantPhoto, UserPlant } from '../domain/models';

export interface GardenRepository {
  listLocations(): Promise<GrowingLocation[]>;
  saveLocation(location: GrowingLocation): Promise<void>;
  listPlants(): Promise<UserPlant[]>;
  getPlant(id: string): Promise<UserPlant | undefined>;
  savePlant(plant: UserPlant): Promise<void>;
  listTasks(): Promise<CareTask[]>;
  saveTask(task: CareTask): Promise<void>;
  listEvents(plantId?: string): Promise<CareEvent[]>;
  appendEvent(event: CareEvent): Promise<void>;
  listPhotos?(plantId?: string): Promise<PlantPhoto[]>;
  savePhoto?(photo: PlantPhoto): Promise<void>;
  clearGuestData(): Promise<void>;
}
