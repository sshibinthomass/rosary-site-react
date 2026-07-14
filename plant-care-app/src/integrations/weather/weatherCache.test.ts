import { expect, it } from 'vitest';

import { WeatherCache } from './weatherCache';

class MapStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

it('returns a six-hour city/day cache entry and expires stale data', () => {
  const storage = new MapStorage();
  const cache = new WeatherCache(storage, 6 * 60 * 60 * 1000);
  const snapshot = { availability: 'live' as const, source: 'open-meteo' as const, precipitationMm: 2, fetchedAt: '2026-07-14T08:00:00.000Z' };
  cache.set('kochi', '2026-07-14', snapshot, new Date('2026-07-14T08:00:00.000Z'));
  expect(cache.get('kochi', '2026-07-14', new Date('2026-07-14T13:59:00.000Z'))).toEqual(snapshot);
  expect(cache.get('kochi', '2026-07-14', new Date('2026-07-14T14:01:00.000Z'))).toBeUndefined();
});
