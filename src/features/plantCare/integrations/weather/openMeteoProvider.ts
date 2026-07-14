import type { WeatherSnapshot } from '../../domain/models';
import type { IndianCity, WeatherProvider } from './WeatherProvider';
import { seasonalWeatherFallback } from './seasonalFallback';
import { WeatherCache } from './weatherCache';

interface ForecastResponse {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    sunshine_duration?: number[];
  };
  hourly?: { relative_humidity_2m?: number[] };
}

export function normalizeForecast(response: ForecastResponse, now = new Date()): WeatherSnapshot {
  const daily = response.daily;
  if (!daily?.time?.[0]) throw new Error('Weather data did not include a daily forecast.');
  const humidities = response.hourly?.relative_humidity_2m?.filter(Number.isFinite) ?? [];
  const averageHumidity = humidities.length ? Math.round(humidities.reduce((sum, value) => sum + value, 0) / humidities.length) : undefined;
  return { availability: 'live', source: 'open-meteo', temperatureMaxC: daily.temperature_2m_max?.[0], temperatureMinC: daily.temperature_2m_min?.[0], precipitationMm: daily.precipitation_sum?.[0], precipitationProbability: daily.precipitation_probability_max?.[0], humidityPercent: averageHumidity, fetchedAt: now.toISOString() };
}

export class OpenMeteoProvider implements WeatherProvider {
  private cache?: WeatherCache;

  constructor(
    private fetcher: typeof fetch = fetch,
    private now: () => Date = () => new Date(),
    cacheStorage: Storage | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
  ) {
    if (cacheStorage) this.cache = new WeatherCache(cacheStorage);
  }

  async searchIndianCities(query: string): Promise<IndianCity[]> {
    if (query.trim().length < 2) return [];
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=en&format=json&countryCode=IN`;
    const response = await this.fetcher(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`City search failed with ${response.status}.`);
    const body = await response.json() as { results?: Array<Record<string, unknown>> };
    return (body.results ?? []).filter((result) => result.country_code === 'IN').map((result) => ({ id: String(result.id), name: String(result.name), admin1: result.admin1 ? String(result.admin1) : undefined, countryCode: 'IN' as const, latitude: Number(result.latitude), longitude: Number(result.longitude) }));
  }

  async getDailyWeather(city: IndianCity): Promise<WeatherSnapshot> {
    const now = this.now();
    const day = now.toISOString().slice(0, 10);
    const cached = this.cache?.get(city.id, day, now);
    if (cached) return cached;
    try {
      const params = new URLSearchParams({ latitude: String(city.latitude), longitude: String(city.longitude), timezone: 'auto', forecast_days: '1', daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunshine_duration', hourly: 'relative_humidity_2m' });
      const response = await this.fetcher(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`Weather request failed with ${response.status}.`);
      const snapshot = normalizeForecast(await response.json() as ForecastResponse, now);
      this.cache?.set(city.id, day, snapshot, now);
      return snapshot;
    } catch {
      return seasonalWeatherFallback(now);
    }
  }
}
