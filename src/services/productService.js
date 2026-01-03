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
  orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'products';

// Get all products (for customers - only available products)
export async function getProducts(category = null) {
  try {
    let q = collection(db, COLLECTION_NAME);
    
    // Build query with available filter
    if (category && category !== 'All') {
      q = query(q, where('category', '==', category), where('available', '==', true));
    } else {
      q = query(q, where('available', '==', true));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

// Get ALL products (for admin - includes unavailable)
export async function getAllProducts() {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
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
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { id: docRef.id, ...productData };
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

// Update product (Admin only)
export async function updateProduct(productId, productData) {
  try {
    const docRef = doc(db, COLLECTION_NAME, productId);
    await updateDoc(docRef, {
      ...productData,
      updatedAt: new Date()
    });
    return { id: productId, ...productData };
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

// Delete product (Admin only)
export async function deleteProduct(productId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, productId);
    await deleteDoc(docRef);
    return productId;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}
