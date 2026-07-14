import { collection, doc, getDocs, onSnapshot, writeBatch, type DocumentData } from 'firebase/firestore';

import type { CareEvent, CareTask, GrowingLocation, UserPlant } from '../domain/models';
import { getFirebaseDb } from '../integrations/firebase';
import type { GardenRepository } from './gardenRepository';

interface SyncRecord { id: string; updatedAt: string }

export function mergeRecords<T extends SyncRecord>(local: T[], remote: T[]): T[] {
  const records = new Map<string, T>();
  for (const record of [...local, ...remote]) {
    const current = records.get(record.id);
    if (!current || record.updatedAt > current.updatedAt) records.set(record.id, record);
  }
  return [...records.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function fromDocuments<T>(documents: Array<{ id: string; data(): DocumentData }>): T[] {
  return documents.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export async function mergeGuestGarden(uid: string, repository: GardenRepository) {
  const database = getFirebaseDb();
  const base = `plantAppUsers/${uid}`;
  const [localLocations, localPlants, localTasks, localEvents, remoteLocations, remotePlants, remoteTasks, remoteEvents] = await Promise.all([
    repository.listLocations(), repository.listPlants(), repository.listTasks(), repository.listEvents(),
    getDocs(collection(database, `${base}/locations`)),
    getDocs(collection(database, `${base}/plants`)),
    getDocs(collection(database, `${base}/tasks`)),
    getDocs(collection(database, `${base}/events`)),
  ]);
  const locations = mergeRecords(localLocations, fromDocuments<GrowingLocation>(remoteLocations.docs));
  const plants = mergeRecords(localPlants, fromDocuments<UserPlant>(remotePlants.docs));
  const tasks = mergeRecords(localTasks, fromDocuments<CareTask>(remoteTasks.docs));
  const eventMap = new Map<string, CareEvent>();
  for (const event of [...fromDocuments<CareEvent>(remoteEvents.docs), ...localEvents]) eventMap.set(event.id, event);
  const events = [...eventMap.values()];
  const batch = writeBatch(database);
  for (const item of locations) { batch.set(doc(database, `${base}/locations/${item.id}`), item); await repository.saveLocation(item); }
  for (const item of plants) { batch.set(doc(database, `${base}/plants/${item.id}`), item); await repository.savePlant(item); }
  for (const item of tasks) { batch.set(doc(database, `${base}/tasks/${item.id}`), item); await repository.saveTask(item); }
  const existingEventIds = new Set(localEvents.map((event) => event.id));
  for (const item of events) {
    batch.set(doc(database, `${base}/events/${item.id}`), item);
    if (!existingEventIds.has(item.id)) await repository.appendEvent(item);
  }
  await batch.commit();
}

export async function startGardenSync(uid: string, repository: GardenRepository, onState: (state: 'syncing' | 'synced' | 'error') => void) {
  onState('syncing');
  try {
    await mergeGuestGarden(uid, repository);
    const database = getFirebaseDb();
    const base = `plantAppUsers/${uid}`;
    const unsubscribers = [
      onSnapshot(collection(database, `${base}/locations`), (snapshot) => { void Promise.all(fromDocuments<GrowingLocation>(snapshot.docs).map((item) => repository.saveLocation(item))); }),
      onSnapshot(collection(database, `${base}/plants`), (snapshot) => { void Promise.all(fromDocuments<UserPlant>(snapshot.docs).map((item) => repository.savePlant(item))); }),
      onSnapshot(collection(database, `${base}/tasks`), (snapshot) => { void Promise.all(fromDocuments<CareTask>(snapshot.docs).map((item) => repository.saveTask(item))); }),
    ];
    onState('synced');
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  } catch (error) {
    onState('error');
    throw error;
  }
}
