import type { IndiaClimateZone, IndiaSeason } from '../domain/models';

const zoneSeasons: Record<IndiaClimateZone, Record<number, IndiaSeason>> = {
  north: {
    1: 'winter', 2: 'winter', 3: 'summer', 4: 'summer', 5: 'summer', 6: 'summer',
    7: 'monsoon', 8: 'monsoon', 9: 'monsoon', 10: 'post-monsoon', 11: 'winter', 12: 'winter',
  },
  south: {
    1: 'winter', 2: 'summer', 3: 'summer', 4: 'summer', 5: 'summer', 6: 'monsoon',
    7: 'monsoon', 8: 'monsoon', 9: 'monsoon', 10: 'post-monsoon', 11: 'post-monsoon', 12: 'winter',
  },
  'humid-coastal': {
    1: 'winter', 2: 'summer', 3: 'summer', 4: 'summer', 5: 'summer', 6: 'monsoon',
    7: 'monsoon', 8: 'monsoon', 9: 'monsoon', 10: 'post-monsoon', 11: 'post-monsoon', 12: 'winter',
  },
  'dry-interior': {
    1: 'winter', 2: 'summer', 3: 'summer', 4: 'summer', 5: 'summer', 6: 'summer',
    7: 'monsoon', 8: 'monsoon', 9: 'post-monsoon', 10: 'post-monsoon', 11: 'winter', 12: 'winter',
  },
  hill: {
    1: 'winter', 2: 'winter', 3: 'post-monsoon', 4: 'summer', 5: 'summer', 6: 'monsoon',
    7: 'monsoon', 8: 'monsoon', 9: 'post-monsoon', 10: 'post-monsoon', 11: 'winter', 12: 'winter',
  },
};

export function getIndianSeason(date: Date, zone: IndiaClimateZone): IndiaSeason {
  return zoneSeasons[zone][date.getUTCMonth() + 1];
}
