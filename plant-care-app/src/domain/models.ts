import type { PlantCategory } from '../data/speciesCatalog';

export type { PlantCategory };

export type IndiaClimateZone = 'north' | 'south' | 'humid-coastal' | 'dry-interior' | 'hill';
export type IndiaSeason = 'summer' | 'monsoon' | 'post-monsoon' | 'winter';
export type LocationKind = 'indoor' | 'balcony';
export type LocationExposure = 'covered' | 'exposed';
export type CareAction = 'water-check' | 'fertilize' | 'rotate' | 'prune' | 'clean' | 'repot' | 'observe';
export type TaskOutcome = 'completed' | 'not-needed' | 'postponed' | 'problem-noted';
export type TaskStatus = 'open' | 'completed' | 'cancelled';

export interface GrowingLocation {
  id: string;
  name: string;
  kind: LocationKind;
  exposure: LocationExposure;
  climateZone: IndiaClimateZone;
  city?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlantProvenance {
  kind: 'catalogue' | 'custom' | 'rosary';
  orderId?: string;
  importId?: string;
}

export interface UserPlant {
  id: string;
  speciesId?: string;
  nickname: string;
  category: PlantCategory;
  locationId: string;
  provenance: PlantProvenance;
  createdAt: string;
  updatedAt: string;
}

export interface WeatherSnapshot {
  availability: 'live' | 'seasonal-fallback';
  source?: 'open-meteo';
  temperatureMaxC?: number;
  temperatureMinC?: number;
  humidityPercent?: number;
  precipitationMm?: number;
  precipitationProbability?: number;
  fetchedAt: string;
}

export interface CareTaskDraft {
  action: CareAction;
  earliestAt: string;
  latestAt: string;
  prompt: string;
  explanation: string;
  source: 'weather-adjusted' | 'season-based';
  priority: 'low' | 'normal' | 'high';
}

export interface CareTask extends CareTaskDraft {
  id: string;
  plantId: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  outcome?: TaskOutcome;
}

export type CareEventType =
  | 'plant_created'
  | 'check_completed'
  | 'checked_not_needed'
  | 'check_postponed'
  | 'problem_noted'
  | 'photo_added';

export interface CareEvent {
  id: string;
  plantId: string;
  type: CareEventType;
  occurredAt: string;
  taskId?: string;
  note?: string;
  photoPath?: string;
}

export interface PlantPhoto {
  id: string;
  plantId: string;
  createdAt: string;
  updatedAt: string;
  note?: string;
  blob?: Blob;
  storagePath?: string;
  syncState: 'local' | 'synced' | 'pending' | 'error';
}

export interface CareEngineInput {
  now: Date;
  plant: UserPlant;
  location: GrowingLocation;
  season: IndiaSeason;
  weather?: WeatherSnapshot;
}

export interface OutcomeInput extends CareEngineInput {
  task: CareTaskDraft;
  outcome: TaskOutcome;
}
