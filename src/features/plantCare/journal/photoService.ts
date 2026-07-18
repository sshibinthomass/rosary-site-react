import { getBlob, ref, uploadBytes } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';

import type { CareEvent, PlantPhoto } from '../domain/models';
import { getFirebaseDb, getFirebaseStorage } from '../integrations/firebase';

export interface PhotoPersistence {
  savePhoto(photo: PlantPhoto): Promise<void>;
  appendEvent(event: CareEvent): Promise<void>;
}

interface GuestPhotoInput {
  plantId: string;
  blob: Blob;
  note?: string;
  persistence: PhotoPersistence;
  now?: () => Date;
  createId?: () => string;
}

function defaultId() { return crypto.randomUUID(); }

async function persistPhoto(photo: PlantPhoto, persistence: PhotoPersistence) {
  await persistence.savePhoto(photo);
  await persistence.appendEvent({
    id: `${photo.id}-event`, plantId: photo.plantId, type: 'photo_added', occurredAt: photo.createdAt,
    note: photo.note, photoPath: photo.storagePath ?? `local:${photo.id}`,
  });
  return photo;
}

export async function saveGuestPlantPhoto({ plantId, blob, note, persistence, now = () => new Date(), createId = defaultId }: GuestPhotoInput) {
  const timestamp = now().toISOString();
  const photo: PlantPhoto = { id: createId(), plantId, blob, note: note?.trim() || undefined, createdAt: timestamp, updatedAt: timestamp, syncState: 'local' };
  return persistPhoto(photo, persistence);
}

export async function saveCloudPlantPhoto(input: GuestPhotoInput & { uid: string }) {
  const id = (input.createId ?? defaultId)();
  const storagePath = `plantAppUsers/${input.uid}/plants/${input.plantId}/${id}.webp`;
  await uploadBytes(ref(getFirebaseStorage(), storagePath), input.blob, { contentType: 'image/webp' });
  const timestamp = (input.now ?? (() => new Date()))().toISOString();
  const photo: PlantPhoto = {
    id, plantId: input.plantId, storagePath, note: input.note?.trim() || undefined,
    createdAt: timestamp, updatedAt: timestamp, syncState: 'synced',
  };
  await setDoc(doc(getFirebaseDb(), `plantAppUsers/${input.uid}/photos/${id}`), photo);
  return persistPhoto(photo, input.persistence);
}

export async function migrateGuestPhoto(uid: string, photo: PlantPhoto, persistence: PhotoPersistence) {
  if (!photo.blob || photo.storagePath) return photo;
  const storagePath = `plantAppUsers/${uid}/plants/${photo.plantId}/${photo.id}.webp`;
  await uploadBytes(ref(getFirebaseStorage(), storagePath), photo.blob, { contentType: 'image/webp' });
  const synced: PlantPhoto = { ...photo, storagePath, syncState: 'synced', updatedAt: new Date().toISOString() };
  delete synced.blob;
  await setDoc(doc(getFirebaseDb(), `plantAppUsers/${uid}/photos/${photo.id}`), synced);
  await persistence.savePhoto(synced);
  return synced;
}

export async function photoObjectUrl(photo: PlantPhoto) {
  const blob = photo.blob ?? (photo.storagePath ? await getBlob(ref(getFirebaseStorage(), photo.storagePath)) : undefined);
  if (!blob) throw new Error('This photo is not available on this device.');
  return URL.createObjectURL(blob);
}
