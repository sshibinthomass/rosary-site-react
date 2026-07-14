import { describe, expect, it, vi } from 'vitest';

import { OpenMeteoProvider, normalizeForecast } from './openMeteoProvider';

const apiResponse = {
  daily: {
    time: ['2026-07-14'],
    temperature_2m_max: [31],
    temperature_2m_min: [24],
    precipitation_sum: [12],
    precipitation_probability_max: [75],
    sunshine_duration: [14400],
  },
  hourly: { relative_humidity_2m: [80, 84, 76] },
};

describe('OpenMeteoProvider', () => {
  it('normalizes provider data into the care weather contract', () => {
    expect(normalizeForecast(apiResponse, new Date('2026-07-14T08:00:00.000Z'))).toEqual(expect.objectContaining({
      availability: 'live', source: 'open-meteo', precipitationMm: 12, humidityPercent: 80,
      fetchedAt: '2026-07-14T08:00:00.000Z',
    }));
  });

  it('limits city search to India', async () => {
    const fetcher = vi.fn(async (_input: string | URL | Request) => new Response(JSON.stringify({ results: [{ id: 1, name: 'Kochi', admin1: 'Kerala', country_code: 'IN', latitude: 9.93, longitude: 76.26 }] }), { status: 200 }));
    const provider = new OpenMeteoProvider(fetcher as typeof fetch, () => new Date('2026-07-14T08:00:00.000Z'));
    await expect(provider.searchIndianCities('Kochi')).resolves.toEqual([expect.objectContaining({ name: 'Kochi', countryCode: 'IN' })]);
    expect(fetcher.mock.calls[0][0]).toContain('countryCode=IN');
  });

  it('returns seasonal fallback when the provider is unavailable', async () => {
    const provider = new OpenMeteoProvider(async () => { throw new Error('offline'); }, () => new Date('2026-07-14T08:00:00.000Z'));
    await expect(provider.getDailyWeather({ id: 'kochi', name: 'Kochi', countryCode: 'IN', latitude: 9.93, longitude: 76.26 }))
      .resolves.toEqual(expect.objectContaining({ availability: 'seasonal-fallback' }));
  });
});
