import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'promoCodes';

/**
 * @typedef {Object} PromoCode
 * @property {string} code - The promo code string (uppercase)
 * @property {'percentage'|'amount'} type - Discount type
 * @property {number} value - Discount value (% or fixed ₹ amount)
 * @property {number} minOrderAmount - Minimum cart total to apply code
 * @property {boolean} active - Whether the code is currently active
 * @property {string} [description] - Optional admin label
 * @property {number} usageCount - How many times the code has been used
 */

export async function getAllPromoCodes() {
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    throw error;
  }
}

export async function getPromoCode(code) {
  try {
    const ref = doc(db, COLLECTION, code.toUpperCase().trim());
    const snap = await getDoc(ref);
    if (snap.exists()) return { id: snap.id, ...snap.data() };
    return null;
  } catch (error) {
    console.error('Error fetching promo code:', error);
    throw error;
  }
}

/**
 * Validate a promo code against the given cart total.
 * Returns { valid, discount, reason } where discount is the ₹ amount to deduct.
 */
export async function validatePromoCode(code, cartTotal) {
  const promo = await getPromoCode(code);

  if (!promo) return { valid: false, discount: 0, reason: 'Invalid promo code' };
  if (!promo.active) return { valid: false, discount: 0, reason: 'This promo code is no longer active' };
  if (cartTotal < (promo.minOrderAmount || 0)) {
    return {
      valid: false,
      discount: 0,
      reason: `Minimum order amount of ₹${promo.minOrderAmount?.toLocaleString('en-IN')} required`
    };
  }

  let discount = 0;
  if (promo.type === 'percentage') {
    discount = Math.round((cartTotal * promo.value) / 100);
  } else {
    discount = promo.value;
  }

  // Never discount more than the cart total
  discount = Math.min(discount, cartTotal);

  return { valid: true, discount, promo };
}

export async function createPromoCode({ code, type, value, minOrderAmount, active, description }) {
  const key = code.toUpperCase().trim();
  const ref = doc(db, COLLECTION, key);
  const data = {
    code: key,
    type,
    value: Number(value),
    minOrderAmount: Number(minOrderAmount) || 0,
    active: active !== false,
    description: description || '',
    usageCount: 0,
    createdAt: serverTimestamp()
  };
  await setDoc(ref, data);
  return { id: key, ...data };
}

export async function updatePromoCode(code, updates) {
  const key = code.toUpperCase().trim();
  const ref = doc(db, COLLECTION, key);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deletePromoCode(code) {
  const key = code.toUpperCase().trim();
  await deleteDoc(doc(db, COLLECTION, key));
}

export async function incrementPromoUsage(code) {
  try {
    const key = code.toUpperCase().trim();
    await updateDoc(doc(db, COLLECTION, key), { usageCount: increment(1) });
  } catch (err) {
    // Non-critical — don't block order creation
    console.warn('Could not increment promo usage:', err);
  }
}
