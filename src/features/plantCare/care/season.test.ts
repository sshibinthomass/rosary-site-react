import { describe, expect, it } from 'vitest';

import { getIndianSeason } from './season';

describe('getIndianSeason', () => {
  it('uses India-zone-specific monsoon windows', () => {
    expect(getIndianSeason(new Date('2026-06-15T12:00:00Z'), 'humid-coastal')).toBe('monsoon');
    expect(getIndianSeason(new Date('2026-06-15T12:00:00Z'), 'north')).toBe('summer');
    expect(getIndianSeason(new Date('2026-07-15T12:00:00Z'), 'north')).toBe('monsoon');
  });

  it('maps winter conservatively for hill climates', () => {
    expect(getIndianSeason(new Date('2026-11-15T12:00:00Z'), 'hill')).toBe('winter');
    expect(getIndianSeason(new Date('2026-02-15T12:00:00Z'), 'hill')).toBe('winter');
  });
});
