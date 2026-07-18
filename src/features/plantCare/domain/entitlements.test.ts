import { expect, it } from 'vitest';

import { getPlanAccess } from './entitlements';

it('keeps public limits while activating current Rosary benefits', () => {
  const access = getPlanAccess({ expiresAt: '2026-08-01T00:00:00.000Z' }, new Date('2026-07-14T00:00:00.000Z'));
  expect(access).toEqual(expect.objectContaining({ maxNonRosaryPlants: 10, unlimitedVerifiedRosaryPlants: true, rosaryPlusActive: true }));
});

it('treats an expired entitlement as standard access', () => {
  expect(getPlanAccess({ expiresAt: '2026-07-01T00:00:00.000Z' }, new Date('2026-07-14T00:00:00.000Z')).rosaryPlusActive).toBe(false);
});
