import type { IndiaSeason, PlantCategory } from '../domain/models';

export interface CheckInterval {
  minimumDays: number;
  maximumDays: number;
}

const intervals: Record<PlantCategory, Record<IndiaSeason, CheckInterval>> = {
  houseplant: {
    summer: { minimumDays: 2, maximumDays: 4 },
    monsoon: { minimumDays: 4, maximumDays: 7 },
    'post-monsoon': { minimumDays: 4, maximumDays: 7 },
    winter: { minimumDays: 6, maximumDays: 10 },
  },
  succulent: {
    summer: { minimumDays: 6, maximumDays: 10 },
    monsoon: { minimumDays: 10, maximumDays: 18 },
    'post-monsoon': { minimumDays: 8, maximumDays: 14 },
    winter: { minimumDays: 12, maximumDays: 21 },
  },
  cactus: {
    summer: { minimumDays: 10, maximumDays: 16 },
    monsoon: { minimumDays: 16, maximumDays: 28 },
    'post-monsoon': { minimumDays: 14, maximumDays: 24 },
    winter: { minimumDays: 21, maximumDays: 35 },
  },
  balcony: {
    summer: { minimumDays: 1, maximumDays: 3 },
    monsoon: { minimumDays: 2, maximumDays: 5 },
    'post-monsoon': { minimumDays: 2, maximumDays: 4 },
    winter: { minimumDays: 3, maximumDays: 6 },
  },
};

export function getCheckInterval(category: PlantCategory, season: IndiaSeason): CheckInterval {
  return intervals[category][season];
}
