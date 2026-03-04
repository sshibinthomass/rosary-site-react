import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

const COLLECTION_NAME = 'products';

// Cache key prefix for localStorage persistence
const CACHE_PREFIX = 'rosary_products_';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

/** Call this after adding/updating/deleting products to keep the cache fresh. */
export function clearProductCache() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

/** Internal helper: Gets valid parsed cache or null */
function getLocalCache(cacheKey) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + cacheKey);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    const isValid = Date.now() - timestamp < CACHE_TTL_MS;
    if (isValid && Array.isArray(data)) {
      return data;
    } else {
      // Clean up expired cache
      localStorage.removeItem(CACHE_PREFIX + cacheKey);
    }
  } catch (e) {
    console.warn('Failed to read product cache:', e);
  }
  return null;
}

/** Internal helper: Sets cache */
function setLocalCache(cacheKey, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + cacheKey,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch (e) {
    console.warn('Failed to write product cache:', e);
  }
}


/**
 * Fast first-page fetch using Firestore limit().
 * Fetches pageSize+1 docs — the extra one tells us if more exist
 * without needing a separate count query.
 * Returns { products: [...], hasMore: boolean }
 */
export async function getProductsPage(category = null, pageSize = 20) {
  try {
    const constraints = [where('available', '==', true), limit(pageSize + 1)];
    if (category && category !== 'All') {
      const lowerCategory = category.toLowerCase();
      if (['indoor', 'hanging', 'mother', 'combo'].includes(lowerCategory)) {
        constraints.unshift(where(lowerCategory, '==', true));
      } else {
        constraints.unshift(where('category', '==', category));
      }
    }
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const hasMore = all.length > pageSize;
    // Slice to pageSize then sort numerically by ID
    const products = all
      .slice(0, pageSize)
      .sort((a, b) => parseInt(a.id) - parseInt(b.id));
    return { products, hasMore };
  } catch (error) {
    console.error('Error getting products page:', error);
    throw error;
  }
}

// Get all products (for customers - only available products)
export async function getProducts(category = null) {
  const cacheKey = category || 'All';

  // Return cached result if available and valid
  const cachedData = getLocalCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    let q = collection(db, COLLECTION_NAME);
    
    // Build query with available filter
    if (category && category !== 'All') {
      const lowerCategory = category.toLowerCase();
      if (['indoor', 'hanging', 'mother', 'combo'].includes(lowerCategory)) {
        q = query(q, where(lowerCategory, '==', true), where('available', '==', true));
      } else {
        q = query(q, where('category', '==', category), where('available', '==', true));
      }
    } else {
      q = query(q, where('available', '==', true));
    }
    
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Sort by ID (numeric)
    const sorted = products.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    // Store in cache
    setLocalCache(cacheKey, sorted);
    return sorted;
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

// Get ALL products (for admin - includes unavailable)
export async function getAllProducts() {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Sort by ID (numeric)
    return products.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  } catch (error) {
    console.error('Error getting all products:', error);
    throw error;
  }
}

// Get single product by ID
export async function getProductById(productId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
}

// Add new product (Admin only)
export async function addProduct(productData) {
  try {
    const normalized = {
      ...productData,
      imageUrls: Array.isArray(productData.imageUrls) && productData.imageUrls.length
        ? productData.imageUrls
        : (productData.imageUrl ? [productData.imageUrl] : []),
    };
    normalized.imageUrl = normalized.imageUrls.length ? normalized.imageUrls[0] : (productData.imageUrl || '');

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...normalized,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    clearProductCache();
    return { id: docRef.id, ...normalized };
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

// Update product (Admin only)
export async function updateProduct(productId, productData) {
  try {
    const normalized = { ...productData };
    
    // Only update image data if it was provided in the update payload
    if ('imageUrls' in productData || 'imageUrl' in productData) {
      normalized.imageUrls = Array.isArray(productData.imageUrls) && productData.imageUrls.length
        ? productData.imageUrls
        : (productData.imageUrl ? [productData.imageUrl] : []);
      normalized.imageUrl = normalized.imageUrls.length ? normalized.imageUrls[0] : (productData.imageUrl || '');
    }

    const docRef = doc(db, COLLECTION_NAME, productId);
    await updateDoc(docRef, {
      ...normalized,
      updatedAt: new Date()
    });
    clearProductCache();
    return { id: productId, ...normalized };
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/** Returns true only for files hosted in Firebase Storage (not external URLs). */
function isFirebaseStorageUrl(url) {
  return typeof url === 'string' && url.includes('firebasestorage.googleapis.com');
}

/** Deletes an array of Firebase Storage image URLs. Silently skips non-Storage URLs. */
export async function deleteStorageImages(imageUrls = []) {
  const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
  await Promise.all(
    urls.filter(isFirebaseStorageUrl).map(async (url) => {
      try {
        await deleteObject(ref(storage, url));
      } catch (err) {
        console.warn('Could not delete image from Storage:', url, err);
      }
    })
  );
}

// Delete product (Admin only). Also deletes all associated images from Storage.
export async function deleteProduct(productId, imageUrls) {
  try {
    const urls = Array.isArray(imageUrls)
      ? imageUrls
      : imageUrls ? [imageUrls] : [];
    await deleteStorageImages(urls);

    const docRef = doc(db, COLLECTION_NAME, productId);
    await deleteDoc(docRef);
    clearProductCache();
    return productId;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}
