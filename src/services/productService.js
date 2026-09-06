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
  limit
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { mergeProductWithLocalEnrichment } from '../utils/productSeo';
import {
  clearProductCacheStorage,
  readProductCache,
  writeProductCache,
} from '../utils/productCache';

const COLLECTION_NAME = 'products';
let localProductsByIdPromise = null;

async function getLocalProductsById() {
  if (localProductsByIdPromise) return localProductsByIdPromise;

  localProductsByIdPromise = (async () => {
    if (typeof fetch !== 'function') return new Map();

    try {
      const response = await fetch('/product-seo-index.json', { cache: 'force-cache' });
      if (!response.ok) return new Map();
      const products = await response.json();
      return new Map((products || []).map((product) => [String(product.id), product]));
    } catch (error) {
      console.warn('Could not load local product SEO enrichment:', error);
      return new Map();
    }
  })();

  return localProductsByIdPromise;
}

async function getLocalProductById(productId) {
  const localProductsById = await getLocalProductsById();
  return localProductsById.get(String(productId));
}

function getProductCacheStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

/** Call this after adding/updating/deleting products to keep the cache fresh. */
export function clearProductCache() {
  clearProductCacheStorage(getProductCacheStorage());
}

/** Internal helper: Gets valid parsed cache or null */
function getLocalCache(cacheKey) {
  return readProductCache(getProductCacheStorage(), cacheKey);
}

/** Internal helper: Sets cache */
function setLocalCache(cacheKey, data) {
  writeProductCache(getProductCacheStorage(), cacheKey, data);
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
    const localProduct = await getLocalProductById(productId);
    const docRef = doc(db, COLLECTION_NAME, productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return mergeProductWithLocalEnrichment({ id: docSnap.id, ...docSnap.data() }, localProduct);
    }
    return localProduct || null;
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

/** Plant ids are strings like "12" or "L3", so compare on the number only. */
function getNumericProductId(product) {
  const digits = String(product?.id ?? '').replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

/**
 * The plants that arrived on the bench most recently, newest first.
 *
 * Firestore orders document ids lexicographically, so a server-side limit would
 * return "99" before "313". Numeric order needs the whole catalogue, which is
 * the same cached read the shop page performs.
 */
export async function getLatestProducts(count = 6) {
  const products = await getProducts();

  return [...products]
    .filter(product => product.available !== false && (product.qtyAvailable !== 'NA' || product.inStock))
    .sort((a, b) => getNumericProductId(b) - getNumericProductId(a))
    .slice(0, count);
}
