import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { getFirebaseApp, getFirebaseDb } from '../firebase';

export interface RosaryImport {
  id: string;
  nickname: string;
  speciesId: string;
  category: 'houseplant' | 'succulent' | 'cactus' | 'balcony';
  orderId: string;
  status: 'available' | 'accepted';
  acceptedPlantId?: string;
}

export async function syncRosaryBenefits() {
  const callable = httpsCallable<void, { importCount: number; entitlementExpiresAt: string | null }>(getFunctions(getFirebaseApp(), 'asia-south1'), 'syncRosaryBenefits');
  return (await callable()).data;
}

export async function acceptRosaryImport(importId: string, locationId: string) {
  const callable = httpsCallable<{ importId: string; locationId: string }, { plantId: string; alreadyAccepted: boolean }>(getFunctions(getFirebaseApp(), 'asia-south1'), 'acceptRosaryImport');
  return (await callable({ importId, locationId })).data;
}

export async function loadRosaryBenefits(uid: string) {
  const database = getFirebaseDb();
  const [imports, entitlement] = await Promise.all([
    getDocs(collection(database, `plantAppUsers/${uid}/rosaryImports`)),
    getDoc(doc(database, `plantAppUsers/${uid}/entitlements/rosary-plus`)),
  ]);
  return {
    imports: imports.docs.map((item) => ({ id: item.id, ...item.data() }) as RosaryImport),
    entitlement: entitlement.exists() ? entitlement.data() as { expiresAt: string } : undefined,
  };
}
