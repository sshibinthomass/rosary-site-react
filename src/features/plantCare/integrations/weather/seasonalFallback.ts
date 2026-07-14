import type { WeatherSnapshot } from '../../domain/models';

export function seasonalWeatherFallback(now = new Date()): WeatherSnapshot {
  return { availability: 'seasonal-fallback', fetchedAt: now.toISOString() };
}
