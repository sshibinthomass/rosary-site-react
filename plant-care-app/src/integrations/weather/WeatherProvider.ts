import type { WeatherSnapshot } from '../../domain/models';

export interface IndianCity {
  id: string;
  name: string;
  admin1?: string;
  countryCode: 'IN';
  latitude: number;
  longitude: number;
}

export interface WeatherProvider {
  searchIndianCities(query: string): Promise<IndianCity[]>;
  getDailyWeather(city: IndianCity): Promise<WeatherSnapshot>;
}
