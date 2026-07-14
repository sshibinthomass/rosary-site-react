import { generateCareTasks, rescheduleAfterOutcome } from '../../care/careEngine';
import { getIndianSeason } from '../../care/season';
import type {
  CareEventType,
  CareTask,
  GrowingLocation,
  PlantProvenance,
  TaskOutcome,
  UserPlant,
} from '../../domain/models';
import type { PlantCategory } from '../../data/speciesCatalog';
import type { GardenRepository } from '../../data/gardenRepository';

export class GardenLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GardenLimitError';
  }
}

interface AddPlantInput {
  speciesId?: string;
  nickname: string;
  category: PlantCategory;
  locationId: string;
  provenance: PlantProvenance;
}

type AddLocationInput = Omit<GrowingLocation, 'id' | 'createdAt' | 'updatedAt'>;

const eventTypeForOutcome: Record<TaskOutcome, CareEventType> = {
  completed: 'check_completed',
  'not-needed': 'checked_not_needed',
  postponed: 'check_postponed',
  'problem-noted': 'problem_noted',
};

function defaultId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class GardenService {
  constructor(
    private repository: GardenRepository,
    private now: () => Date = () => new Date(),
    private createId: () => string = defaultId,
  ) {}

  async addLocation(input: AddLocationInput): Promise<GrowingLocation> {
    const existing = await this.repository.listLocations();
    if (existing.some((location) => location.kind === input.kind)) {
      throw new GardenLimitError(`The free garden includes one ${input.kind} location.`);
    }
    const timestamp = this.now().toISOString();
    const location: GrowingLocation = { ...input, id: this.createId(), createdAt: timestamp, updatedAt: timestamp };
    await this.repository.saveLocation(location);
    return location;
  }

  async addPlant(input: AddPlantInput): Promise<UserPlant> {
    const locations = await this.repository.listLocations();
    const location = locations.find((item) => item.id === input.locationId);
    if (!location) throw new Error('Choose a saved growing location before adding this plant.');

    const plants = await this.repository.listPlants();
    const nonRosaryCount = plants.filter((plant) => plant.provenance.kind !== 'rosary').length;
    if (input.provenance.kind !== 'rosary' && nonRosaryCount >= 10) {
      throw new GardenLimitError('The free garden includes up to ten non-Rosary plants.');
    }

    const date = this.now();
    const timestamp = date.toISOString();
    const plant: UserPlant = {
      ...input,
      id: this.createId(),
      nickname: input.nickname.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.savePlant(plant);
    await this.repository.appendEvent({
      id: this.createId(), plantId: plant.id, type: 'plant_created', occurredAt: timestamp,
    });

    const drafts = generateCareTasks({
      now: date,
      plant,
      location,
      season: getIndianSeason(date, location.climateZone),
    });
    for (const draft of drafts) {
      await this.repository.saveTask({
        ...draft,
        earliestAt: timestamp,
        latestAt: new Date(date.getTime() + 86_400_000).toISOString(),
        explanation: `Start with a baseline observation. ${draft.explanation}`,
        id: this.createId(),
        plantId: plant.id,
        status: 'open',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    return plant;
  }

  async completeTask(taskId: string, outcome: TaskOutcome): Promise<CareTask[]> {
    const task = (await this.repository.listTasks()).find((item) => item.id === taskId);
    if (!task || task.status !== 'open') throw new Error('This care check is no longer open.');
    const plant = await this.repository.getPlant(task.plantId);
    if (!plant) throw new Error('The plant for this care check could not be found.');
    const location = (await this.repository.listLocations()).find((item) => item.id === plant.locationId);
    if (!location) throw new Error('The growing location for this plant could not be found.');

    const date = this.now();
    const timestamp = date.toISOString();
    await this.repository.saveTask({ ...task, status: 'completed', outcome, completedAt: timestamp, updatedAt: timestamp });
    await this.repository.appendEvent({
      id: this.createId(), plantId: plant.id, taskId: task.id, type: eventTypeForOutcome[outcome], occurredAt: timestamp,
    });

    const drafts = rescheduleAfterOutcome({
      now: date,
      plant,
      location,
      season: getIndianSeason(date, location.climateZone),
      task,
      outcome,
    });
    const replacements: CareTask[] = [];
    for (const draft of drafts) {
      const replacement: CareTask = {
        ...draft, id: this.createId(), plantId: plant.id, status: 'open', createdAt: timestamp, updatedAt: timestamp,
      };
      await this.repository.saveTask(replacement);
      replacements.push(replacement);
    }
    return replacements;
  }
}
