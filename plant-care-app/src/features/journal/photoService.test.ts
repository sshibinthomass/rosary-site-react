import { expect, it } from 'vitest';

import type { CareEvent, PlantPhoto } from '../../domain/models';
import { saveGuestPlantPhoto, type PhotoPersistence } from './photoService';

it('stores a private guest photo and appends an immutable photo event', async () => {
  const photos: PlantPhoto[] = [];
  const events: CareEvent[] = [];
  const persistence: PhotoPersistence = {
    async savePhoto(photo) { photos.push(photo); },
    async appendEvent(event) { events.push(event); },
  };
  const blob = new Blob(['webp'], { type: 'image/webp' });
  const photo = await saveGuestPlantPhoto({ plantId: 'aloe', blob, note: 'New leaf', persistence, now: () => new Date('2026-07-14T08:00:00.000Z'), createId: () => 'photo-1' });
  expect(photos[0]).toEqual(expect.objectContaining({ id: 'photo-1', blob, updatedAt: '2026-07-14T08:00:00.000Z', syncState: 'local' }));
  expect(events[0]).toEqual(expect.objectContaining({ type: 'photo_added', photoPath: 'local:photo-1' }));
  expect(photo.id).toBe('photo-1');
});
