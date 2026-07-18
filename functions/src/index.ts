import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import generatedLinks from './productLinks.generated.json' with { type: 'json' };
import {
  buildEntitlement,
  buildImportSuggestions,
  type Entitlement,
  type PlantCategory,
  type ProductLink,
  type RosaryOrder,
} from './rosaryBenefits.js';

if (!getApps().length) initializeApp();
const database = getFirestore();

function requireUserId(auth: { uid: string } | undefined) {
  if (!auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to connect Rosary purchases.');
  return auth.uid;
}

function productLinksFromBundle() {
  return new Map(Object.entries(generatedLinks) as Array<[string, ProductLink]>);
}

export const syncRosaryBenefits = onCall({ region: 'asia-south1' }, async (request) => {
  const uid = requireUserId(request.auth);
  const [orderSnapshot, linkOverrides] = await Promise.all([
    database.collection('orders').where('customer.userId', '==', uid).get(),
    database.collection('plantCareProductLinks').get(),
  ]);
  const orders: RosaryOrder[] = orderSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const links = productLinksFromBundle();
  for (const item of linkOverrides.docs) {
    const data = item.data();
    if (data.speciesId && data.category) links.set(item.id, { speciesId: String(data.speciesId), category: data.category as PlantCategory });
  }
  const suggestions = buildImportSuggestions(orders, links);
  const entitlementRef = database.doc(`plantAppUsers/${uid}/entitlements/rosary-plus`);
  const existingEntitlement = (await entitlementRef.get()).data() as Entitlement | undefined;
  const now = new Date();
  let entitlement = existingEntitlement;
  for (const order of orders) entitlement = buildEntitlement(order, entitlement, now);

  const importRefs = suggestions.map((suggestion) => database.doc(`plantAppUsers/${uid}/rosaryImports/${suggestion.id}`));
  const existingImports = importRefs.length ? await database.getAll(...importRefs) : [];
  const batch = database.batch();
  for (const [index, suggestion] of suggestions.entries()) {
    if (existingImports[index]?.data()?.status === 'accepted') continue;
    batch.set(importRefs[index], { ...suggestion, uid, updatedAt: now.toISOString(), createdAt: existingImports[index]?.data()?.createdAt ?? now.toISOString() }, { merge: true });
  }
  if (entitlement) batch.set(entitlementRef, { ...entitlement, uid, updatedAt: now.toISOString() }, { merge: true });
  await batch.commit();
  return { importCount: suggestions.length, entitlementExpiresAt: entitlement?.expiresAt ?? null };
});

export const acceptRosaryImport = onCall({ region: 'asia-south1' }, async (request) => {
  const uid = requireUserId(request.auth);
  const importId = String(request.data?.importId ?? '');
  const locationId = String(request.data?.locationId ?? '');
  if (!importId || !locationId) throw new HttpsError('invalid-argument', 'Choose a Rosary plant and growing place.');

  return database.runTransaction(async (transaction) => {
    const importRef = database.doc(`plantAppUsers/${uid}/rosaryImports/${importId}`);
    const locationRef = database.doc(`plantAppUsers/${uid}/locations/${locationId}`);
    const [importSnapshot, locationSnapshot] = await Promise.all([transaction.get(importRef), transaction.get(locationRef)]);
    if (!importSnapshot.exists) throw new HttpsError('not-found', 'This Rosary import is no longer available.');
    if (!locationSnapshot.exists) throw new HttpsError('failed-precondition', 'The selected growing place was not found.');
    const plantImport = importSnapshot.data()!;
    if (plantImport.uid !== uid) throw new HttpsError('permission-denied', 'This import belongs to another account.');
    if (plantImport.status === 'accepted' && plantImport.acceptedPlantId) return { plantId: plantImport.acceptedPlantId, alreadyAccepted: true };
    if (plantImport.status !== 'available') throw new HttpsError('failed-precondition', 'This import cannot be accepted.');

    const now = new Date();
    const timestamp = now.toISOString();
    const plantId = `rosary-${importId}`;
    const plantRef = database.doc(`plantAppUsers/${uid}/plants/${plantId}`);
    const taskRef = database.doc(`plantAppUsers/${uid}/tasks/${plantId}-baseline`);
    const eventRef = database.doc(`plantAppUsers/${uid}/events/${plantId}-created`);
    const isDryPlant = plantImport.category === 'succulent' || plantImport.category === 'cactus';
    const prompt = isDryPlant
      ? 'Check that the mix is dry well below the surface and the pot feels light. Water only if both checks pass.'
      : "Check the top 3 cm of soil and the plant's leaves. Water only if the soil is dry for this plant.";

    transaction.set(plantRef, {
      id: plantId,
      speciesId: plantImport.speciesId,
      nickname: plantImport.nickname,
      category: plantImport.category,
      locationId,
      provenance: { kind: 'rosary', orderId: plantImport.orderId, importId },
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    transaction.set(eventRef, { id: eventRef.id, plantId, type: 'plant_created', occurredAt: timestamp });
    transaction.set(taskRef, {
      id: taskRef.id, plantId, action: 'water-check', status: 'open', priority: 'normal', source: 'season-based',
      prompt, explanation: 'Start with a baseline observation for your verified Rosary plant.',
      earliestAt: timestamp, latestAt: new Date(now.getTime() + 86_400_000).toISOString(), createdAt: timestamp, updatedAt: timestamp,
    });
    transaction.update(importRef, { status: 'accepted', acceptedPlantId: plantId, acceptedAt: timestamp, updatedAt: timestamp });
    return { plantId, alreadyAccepted: false };
  });
});
