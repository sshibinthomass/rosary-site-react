import { collection, doc, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

let seedProductsPromise = null;

async function getSeedProducts() {
  if (!seedProductsPromise) {
    seedProductsPromise = import('../data/products.json').then((module) => module.default || []);
  }

  return seedProductsPromise;
}

// Seed all products from the JSON file
export async function seedProducts(onProgress) {
  const products = await getSeedProducts();
  const batchSize = 500; // Firestore limit is 500 per batch
  let totalAdded = 0;

  try {
    // Process in batches
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = products.slice(i, i + batchSize);

      chunk.forEach((product) => {
        const docRef = doc(collection(db, 'products'), product.id);
        const { id, ...data } = product;
        batch.set(docRef, {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      await batch.commit();
      totalAdded += chunk.length;
      
      if (onProgress) {
        onProgress(totalAdded, products.length);
      }
    }

    return { success: true, count: totalAdded };
  } catch (error) {
    console.error('Error seeding products:', error);
    throw error;
  }
}

// Clear all products (use with caution!)
export async function clearAllProducts() {
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    const batchSize = 500;
    let batch = writeBatch(db);
    let count = 0;

    for (const docSnap of snapshot.docs) {
      batch.delete(docSnap.ref);
      count++;

      if (count % batchSize === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }

    if (count % batchSize !== 0) {
      await batch.commit();
    }

    return { success: true, deleted: snapshot.size };
  } catch (error) {
    console.error('Error clearing products:', error);
    throw error;
  }
}

// Get count of products in JSON
export async function getProductCount() {
  const products = await getSeedProducts();
  return products.length;
}
