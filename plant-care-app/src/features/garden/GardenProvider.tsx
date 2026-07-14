import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { CareEvent, CareTask, GrowingLocation, PlantProvenance, TaskOutcome, UserPlant } from '../../domain/models';
import type { PlantCategory } from '../../data/speciesCatalog';
import type { GardenRepository } from '../../data/gardenRepository';
import { IndexedDbGardenRepository } from '../../data/indexedDbGardenRepository';
import { firebaseIsConfigured } from '../../integrations/firebaseConfig';
import { useAuth } from '../auth/AuthProvider';
import { GardenService } from './GardenService';

interface GardenContextValue {
  locations: GrowingLocation[];
  plants: UserPlant[];
  tasks: CareTask[];
  events: CareEvent[];
  loading: boolean;
  error?: string;
  syncState: 'local' | 'syncing' | 'synced' | 'error';
  addLocation(input: Omit<GrowingLocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<GrowingLocation>;
  addPlant(input: { speciesId?: string; nickname: string; category: PlantCategory; locationId: string; provenance: PlantProvenance }): Promise<UserPlant>;
  completeTask(id: string, outcome: TaskOutcome): Promise<CareTask[]>;
  refresh(): Promise<void>;
}

const GardenContext = createContext<GardenContextValue | undefined>(undefined);

interface GardenProviderProps extends PropsWithChildren {
  repository?: GardenRepository;
  now?: () => Date;
}

export function GardenProvider({ children, repository, now }: GardenProviderProps) {
  const { user } = useAuth();
  const repo = useMemo(() => repository ?? new IndexedDbGardenRepository(), [repository]);
  const service = useMemo(() => new GardenService(repo, now), [repo, now]);
  const [locations, setLocations] = useState<GrowingLocation[]>([]);
  const [plants, setPlants] = useState<UserPlant[]>([]);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [syncState, setSyncState] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');

  const refresh = useCallback(async () => {
    try {
      const [nextLocations, nextPlants, nextTasks, nextEvents] = await Promise.all([
        repo.listLocations(), repo.listPlants(), repo.listTasks(), repo.listEvents(),
      ]);
      setLocations(nextLocations);
      setPlants(nextPlants);
      setTasks(nextTasks.sort((a, b) => a.earliestAt.localeCompare(b.earliestAt)));
      setEvents(nextEvents.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)));
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
    void import('../../data/firebaseGardenSync').then(({ startGardenSync }) => startGardenSync(user.uid, repo, (state) => active && setSyncState(state)))
      .then((unsubscribe) => { stop = unsubscribe; return refresh(); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Garden sync could not start.'); });
    return () => { active = false; stop?.(); };
  }, [refresh, repo, user]);

  const syncAfterChange = useCallback(async () => {
    if (!user || !firebaseIsConfigured) return;
    setSyncState('syncing');
    try {
      const { mergeGuestGarden } = await import('../../data/firebaseGardenSync');
      await mergeGuestGarden(user.uid, repo);
      setSyncState('synced');
    } catch {
      setSyncState('error');
    }
  }, [repo, user]);

  const value = useMemo<GardenContextValue>(() => ({
    locations,
    plants,
    tasks,
    events,
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
    refresh,
  }), [error, events, loading, locations, plants, refresh, service, syncAfterChange, syncState, tasks]);

  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}

export function useGarden() {
  const value = useContext(GardenContext);
  if (!value) throw new Error('useGarden must be used inside GardenProvider.');
  return value;
}
