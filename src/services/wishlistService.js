import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Get user's wishlist
export async function getWishlist(userId) {
  try {
    const wishlistRef = collection(db, 'users', userId, 'wishlist');
    const snapshot = await getDocs(wishlistRef);
    return snapshot.docs.map(doc => ({
      productId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting wishlist:', error);
    throw error;
  }
}

// Add item to wishlist
export async function addToWishlist(userId, product) {
  try {
    const itemRef = doc(db, 'users', userId, 'wishlist', product.id);
    await setDoc(itemRef, {
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      addedAt: new Date()
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
}

// Remove item from wishlist
export async function removeFromWishlist(userId, productId) {
  try {
    const itemRef = doc(db, 'users', userId, 'wishlist', productId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw error;
  }
}
