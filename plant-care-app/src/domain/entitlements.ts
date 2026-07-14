export interface RosaryEntitlement { expiresAt: string }

export function getPlanAccess(entitlement: RosaryEntitlement | undefined, now = new Date()) {
  const expiresAt = entitlement ? new Date(entitlement.expiresAt).getTime() : 0;
  return {
    maxNonRosaryPlants: 10,
    maxIndoorLocations: 1,
    maxBalconyLocations: 1,
    unlimitedVerifiedRosaryPlants: true,
    rosaryPlusActive: Number.isFinite(expiresAt) && expiresAt > now.getTime(),
  };
}
