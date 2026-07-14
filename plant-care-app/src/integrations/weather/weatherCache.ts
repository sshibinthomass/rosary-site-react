import type { WeatherSnapshot } from '../../domain/models';

interface CacheStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface CacheEntry { storedAt: number; snapshot: WeatherSnapshot }

export class WeatherCache {
  constructor(private storage: CacheStorage, private ttlMs = 6 * 60 * 60 * 1000) {}

  private key(cityId: string, day: string) { return `weather:${cityId}:${day}`; }

  get(cityId: string, day: string, now = new Date()) {
    const key = this.key(cityId, day);
    const raw = this.storage.getItem(key);
    if (!raw) return undefined;
    try {
      const entry = JSON.parse(raw) as CacheEntry;
      if (now.getTime() - entry.storedAt > this.ttlMs) {
        this.storage.removeItem(key);
        return undefined;
      }
      return entry.snapshot;
    } catch {
      this.storage.removeItem(key);
      return undefined;
    }
  }

  set(cityId: string, day: string, snapshot: WeatherSnapshot, now = new Date()) {
    this.storage.setItem(this.key(cityId, day), JSON.stringify({ storedAt: now.getTime(), snapshot } satisfies CacheEntry));
  }
}
