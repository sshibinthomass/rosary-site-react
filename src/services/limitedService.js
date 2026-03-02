import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'limited';
const COUNTERS_COLLECTION = 'counters';
const COUNTER_DOC_ID = 'limited';

/**
 * Get the next numeric sequence for limited plants and
 * return the Firestore document ID in the format L<number>.
 * Ensures IDs are unique and strictly ascending.
 */
async function getNextLimitedId() {
  const counterRef = doc(db, COUNTERS_COLLECTION, COUNTER_DOC_ID);

  const nextId = await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    let current = 0;

    if (counterSnap.exists()) {
      current = counterSnap.data().lastNumber || 0;
    }

    const next = current + 1;
    transaction.set(counterRef, { lastNumber: next }, { merge: true });
    return next;
  });

  // Format like "L1", "L2", ... (no zero padding required)
  return `L${nextId}`;
}

/**
 * Get a single limited plant by its document ID (e.g. "L5").
 */
export async function getLimitedById(limitedId) {
  const docRef = doc(db, COLLECTION_NAME, limitedId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Get all limited plants.
 * By default returns only available plants.
 * Uses simple filters only so no composite index is required.
 */
export async function getLimitedPlants({ availableOnly = true } = {}) {
  let q = collection(db, COLLECTION_NAME);

  if (availableOnly) {
    q = query(q, where('available', '==', true));
  }

  const snapshot = await getDocs(q);
  const items = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));

  // Ensure IDs with L<number> are sorted numerically ascending if needed
  return items.sort((a, b) => {
    const na = parseInt((a.id || '').replace(/^L/i, ''), 10);
    const nb = parseInt((b.id || '').replace(/^L/i, ''), 10);
    if (Number.isNaN(na) || Number.isNaN(nb)) return 0;
    return na - nb;
  });
}

/**
 * Get a paginated page of limited plants.
 * Returns { items, hasMore }.
 * Pagination is done in-memory to avoid composite indexes.
 */
export async function getLimitedPlantsPage(pageSize = 20, { availableOnly = true } = {}) {
  const all = await getLimitedPlants({ availableOnly });
  const hasMore = all.length > pageSize;
  const items = all.slice(0, pageSize);

  return { items, hasMore };
}

/**
 * Add a new limited-stock plant.
 *
 * Fields supported:
 * - available (boolean)
 * - commonName
 * - title
 * - price
 * - size
 * - sunlight
 * - watering
 * - transit
 * - imageUrl (primary image)
 * - imageUrls (array of image URLs for multiple images)
 */
export async function addLimitedPlant(data) {
  const limitedId = await getNextLimitedId();

  const now = serverTimestamp();

  const payload = {
    // Core fields
    available: data.available ?? true,
    commonName: data.commonName || '',
    title: data.title || '',
    price: data.price ?? null,
    size: data.size || '',
    sunlight: data.sunlight || '',
    watering: data.watering || '',
    transit: data.transit || '',

    // Images: support single + multiple
    imageUrl: data.imageUrl || (Array.isArray(data.imageUrls) && data.imageUrls[0]) || '',
    imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : (data.imageUrl ? [data.imageUrl] : []),

    // Metadata
    createdAt: now,
    updatedAt: now
  };

  const docRef = doc(db, COLLECTION_NAME, limitedId);
  await setDoc(docRef, payload);

  return { id: limitedId, ...payload };
}

/**
 * Update an existing limited plant.
 * Accepts the same fields as addLimitedPlant (except id/createdAt).
 */
export async function updateLimitedPlant(limitedId, data) {
  const docRef = doc(db, COLLECTION_NAME, limitedId);

  const updates = {
    ...data,
    updatedAt: serverTimestamp()
  };

  // Keep imageUrl in sync with imageUrls if needed
  if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
    updates.imageUrl = data.imageUrl || data.imageUrls[0];
  }

  await updateDoc(docRef, updates);
  return { id: limitedId, ...updates };
}

/**
 * Delete a limited plant document.
 * (Does not delete any images from Storage – do that separately if required.)
 */
export async function deleteLimitedPlant(limitedId) {
  const docRef = doc(db, COLLECTION_NAME, limitedId);
  await deleteDoc(docRef);
  return limitedId;
}

