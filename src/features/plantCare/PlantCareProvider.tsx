import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { CareEvent, CareTask, GrowingLocation, PlantPhoto, PlantProvenance, TaskOutcome, UserPlant } from './domain/models';
import type { PlantCategory } from './data/speciesCatalog';
import type { GardenRepository } from './data/gardenRepository';
import { IndexedDbGardenRepository } from './data/indexedDbGardenRepository';
import { SyncRetryQueue } from './data/syncRetryQueue';
import { firebaseIsConfigured } from './integrations/firebase';
import type { WeatherProvider } from './integrations/weather/WeatherProvider';
import { GardenService } from './services/GardenService';

interface GardenContextValue {
  locations: GrowingLocation[];
  plants: UserPlant[];
  tasks: CareTask[];
  events: CareEvent[];
  photos: PlantPhoto[];
  loading: boolean;
  error?: string;
  syncState: 'local' | 'syncing' | 'synced' | 'error';
  addLocation(input: Omit<GrowingLocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<GrowingLocation>;
  addPlant(input: { speciesId?: string; nickname: string; category: PlantCategory; locationId: string; provenance: PlantProvenance }): Promise<UserPlant>;
  completeTask(id: string, outcome: TaskOutcome): Promise<CareTask[]>;
  addPhoto(plantId: string, blob: Blob, note?: string): Promise<PlantPhoto>;
  refresh(): Promise<void>;
}

const PlantCareContext = createContext<GardenContextValue | undefined>(undefined);

export interface PlantCareProviderProps extends PropsWithChildren {
  user: { uid: string } | null;
  repository?: GardenRepository;
  now?: () => Date;
  weatherProvider?: WeatherProvider | null;
}

export function PlantCareProvider({ children, user, repository, now, weatherProvider: providedWeatherProvider }: PlantCareProviderProps) {
  const repo = useMemo(() => repository ?? new IndexedDbGardenRepository(), [repository]);
  const weatherProvider = useMemo(
    () => providedWeatherProvider ?? undefined,
    [providedWeatherProvider],
  );
  const service = useMemo(() => new GardenService(repo, now, undefined, weatherProvider), [repo, now, weatherProvider]);
  const retryQueue = useMemo(() => new SyncRetryQueue(localStorage), []);
  const [locations, setLocations] = useState<GrowingLocation[]>([]);
  const [plants, setPlants] = useState<UserPlant[]>([]);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [photos, setPhotos] = useState<PlantPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [syncState, setSyncState] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');

  const refresh = useCallback(async () => {
    try {
      const [nextLocations, nextPlants, nextTasks, nextEvents, nextPhotos] = await Promise.all([
        repo.listLocations(), repo.listPlants(), repo.listTasks(), repo.listEvents(), repo.listPhotos?.() ?? Promise.resolve([]),
      ]);
      setLocations(nextLocations);
      setPlants(nextPlants);
      setTasks(nextTasks.sort((a, b) => a.earliestAt.localeCompare(b.earliestAt)));
      setEvents(nextEvents.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)));
      setPhotos(nextPhotos.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your local garden could not be opened.');
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!user || !firebaseIsConfigured) {
      setSyncState('local');
      return undefined;
    }
    let active = true;
    let stop: (() => void) | undefined;
    if (repo.savePhoto) {
      void import('./journal/photoService').then(async ({ migrateGuestPhoto }) => {
        const localPhotos = await (repo.listPhotos?.() ?? []);
        for (const photo of localPhotos.filter((item) => item.syncState === 'local')) {
          await migrateGuestPhoto(user.uid, photo, { savePhoto: repo.savePhoto!.bind(repo), appendEvent: repo.appendEvent.bind(repo) });
        }
      }).catch(() => undefined);
    }
    void import('./data/firebaseGardenSync').then(({ startGardenSync }) => startGardenSync(user.uid, repo, (state) => active && setSyncState(state)))
      .then((unsubscribe) => { stop = unsubscribe; return refresh(); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Garden sync could not start.'); });
    return () => { active = false; stop?.(); };
  }, [refresh, repo, user]);

  const syncAfterChange = useCallback(async () => {
    if (!user || !firebaseIsConfigured) return;
    setSyncState('syncing');
    try {
      const { mergeGuestGarden } = await import('./data/firebaseGardenSync');
      await mergeGuestGarden(user.uid, repo);
      retryQueue.clear();
      setSyncState('synced');
    } catch (caught) {
      const operation = retryQueue.recordFailure(caught);
      setSyncState('error');
      if (!operation.retryable) setError('Cloud sync needs account permission. Your local garden is safe on this device.');
    }
  }, [repo, retryQueue, user]);

  useEffect(() => {
    if (!user) return undefined;
    let timer: number | undefined;
    const scheduleRetry = () => {
      const pending = retryQueue.get();
      if (!pending?.retryable || !pending.nextAttemptAt) return;
      const delay = Math.max(0, new Date(pending.nextAttemptAt).getTime() - Date.now());
      timer = window.setTimeout(() => void syncAfterChange(), Math.min(delay, 300_000));
    };
    window.addEventListener('online', scheduleRetry);
    scheduleRetry();
    return () => { if (timer !== undefined) window.clearTimeout(timer); window.removeEventListener('online', scheduleRetry); };
  }, [retryQueue, syncAfterChange, user]);

  const value = useMemo<GardenContextValue>(() => ({
    locations,
    plants,
    tasks,
    events,
    photos,
    loading,
    error,
    syncState,
    async addLocation(input) {
      const result = await service.addLocation(input);
      await refresh();
      await syncAfterChange();
      return result;
    },
    async addPlant(input) {
      const result = await service.addPlant(input);
      await refresh();
      await syncAfterChange();
      return result;
    },
    async completeTask(id, outcome) {
      const result = await service.completeTask(id, outcome);
      await refresh();
      await syncAfterChange();
      return result;
    },
    async addPhoto(plantId, blob, note) {
      if (!repo.savePhoto) throw new Error('Photo storage is not available on this device.');
      const photoService = await import('./journal/photoService');
      const persistence = { savePhoto: repo.savePhoto.bind(repo), appendEvent: repo.appendEvent.bind(repo) };
      const result = user && firebaseIsConfigured
        ? await photoService.saveCloudPlantPhoto({ uid: user.uid, plantId, blob, note, persistence })
        : await photoService.saveGuestPlantPhoto({ plantId, blob, note, persistence });
      await refresh();
      await syncAfterChange();
      return result;
    },
    refresh,
  }), [error, events, loading, locations, photos, plants, refresh, repo, service, syncAfterChange, syncState, tasks, user]);

  return <PlantCareContext.Provider value={value}>{children}</PlantCareContext.Provider>;
}

export function usePlantCare() {
  const value = useContext(PlantCareContext);
  if (!value) throw new Error('usePlantCare must be used inside PlantCareProvider.');
  return value;
}
