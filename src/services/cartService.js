import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Get user's cart
export async function getCart(userId) {
  try {
    const cartRef = collection(db, 'users', userId, 'cart');
    const snapshot = await getDocs(cartRef);
    return snapshot.docs.map(doc => ({
      productId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting cart:', error);
    throw error;
  }
}

// Add item to cart
export async function addToCart(userId, product, quantity = 1) {
  try {
    const itemRef = doc(db, 'users', userId, 'cart', product.id);
    await setDoc(itemRef, {
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      quantity: quantity,
      addedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}

// Remove item from cart
export async function removeFromCart(userId, productId) {
  try {
    const itemRef = doc(db, 'users', userId, 'cart', productId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('Error removing from cart:', error);
    throw error;
  }
}

// Update cart item quantity
export async function updateCartQuantity(userId, productId, quantity) {
  try {
    const itemRef = doc(db, 'users', userId, 'cart', productId);
    await setDoc(itemRef, { quantity }, { merge: true });
  } catch (error) {
    console.error('Error updating quantity:', error);
    throw error;
  }
}

// Clear entire cart
export async function clearCart(userId) {
  try {
    const cartRef = collection(db, 'users', userId, 'cart');
    const snapshot = await getDocs(cartRef);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
}
