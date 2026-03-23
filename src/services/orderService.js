import { 
  collection, 
  doc, 
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'orders';

/**
 * Generate a unique order ID (e.g., RPH-20260118-ABC123)
 */
function generateOrderId() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RPH-${dateStr}-${randomStr}`;
}

/**
 * Create a new order in Firestore
 * @param {Object} orderData - Order details
 * @returns {Object} Created order with ID
 */
export async function createOrder(orderData) {
  try {
    const orderId = generateOrderId();
    
    const docRef = doc(collection(db, COLLECTION_NAME));
    const orderUrl = getOrderUrl(docRef.id);
    
    const order = {
      orderId,
      orderUrl,
      items: orderData.items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl || null
      })),
      totalAmount: orderData.totalAmount,
      totalItems: orderData.items.reduce((sum, item) => sum + item.quantity, 0),

      // Promo / discount
      ...(orderData.promoCode ? {
        promoCode: orderData.promoCode,
        discountAmount: orderData.discountAmount || 0,
        discountType: orderData.discountType || null,
        discountValue: orderData.discountValue || 0,
        originalAmount: orderData.originalAmount || orderData.totalAmount
      } : {}),
      
      // Customer info
      customer: {
        userId: orderData.userId || null,
        name: orderData.customerInfo.name || '',
        phone: orderData.customerInfo.phone || '',
        whatsapp: orderData.customerInfo.whatsapp || '',
        address: orderData.customerInfo.address || '',
        pincode: orderData.customerInfo.pincode || '',
        district: orderData.customerInfo.district || '',
        state: orderData.customerInfo.state || ''
      },
      
      // Order status
      status: 'pending',
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(docRef, order);
    
    return {
      id: docRef.id,
      ...order
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Get order by Firestore document ID
 */
export async function getOrderById(docId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
}

/**
 * Get orders by user ID
 */
export async function getOrdersByUserId(userId) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('customer.userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user orders:', error);
    throw error;
  }
}

/**
 * Get all orders (admin)
 */
export async function getAllOrders() {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all orders:', error);
    throw error;
  }
}


/**
 * Update order status (admin)
 */
export async function updateOrderStatus(orderId, newStatus) {
  try {
    const docRef = doc(db, COLLECTION_NAME, orderId);
    await updateDoc(docRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    return { id: orderId, status: newStatus };
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Update order customer details
 */
export async function updateOrderCustomer(orderId, customerData) {
  try {
    const docRef = doc(db, COLLECTION_NAME, orderId);
    await updateDoc(docRef, {
      customer: customerData,
      updatedAt: serverTimestamp()
    });
    return { id: orderId, customer: customerData };
  } catch (error) {
    console.error('Error updating customer details:', error);
    throw error;
  }
}

/**
 * Update delivery charge on an order (admin)
 */
export async function updateDeliveryCharge(orderId, deliveryCharge) {
  try {
    const docRef = doc(db, COLLECTION_NAME, orderId);
    await updateDoc(docRef, {
      deliveryCharge: deliveryCharge,
      updatedAt: serverTimestamp()
    });
    return { id: orderId, deliveryCharge };
  } catch (error) {
    console.error('Error updating delivery charge:', error);
    throw error;
  }
}

/**
 * Update manual discount on an order (admin)
 */
export async function updateManualDiscount(orderId, manualDiscount) {
  try {
    const docRef = doc(db, COLLECTION_NAME, orderId);
    await updateDoc(docRef, {
      manualDiscount: manualDiscount,
      updatedAt: serverTimestamp()
    });
    return { id: orderId, manualDiscount };
  } catch (error) {
    console.error('Error updating manual discount:', error);
    throw error;
  }
}

/**
 * Update order items and recalculate totals (admin).
 * Re-applies any existing promo code discount after recalculating the raw total.
 * If the new total falls below the promo's minimum order amount the promo is removed.
 */
export async function updateOrderItems(orderId, items) {
  try {
    const docRef = doc(db, COLLECTION_NAME, orderId);

    const originalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Fetch existing order to check for a promo code
    const snap = await getDoc(docRef);
    const existing = snap.exists() ? snap.data() : {};

    let totalAmount = originalAmount;
    let discountAmount = 0;
    let promoRemoved = false;

    if (existing.promoCode && existing.discountType) {
      const meetsMinimum = originalAmount >= (existing.minOrderAmount || 0);

      if (meetsMinimum) {
        if (existing.discountType === 'percentage') {
          discountAmount = Math.round((originalAmount * existing.discountValue) / 100);
        } else {
          discountAmount = existing.discountValue || 0;
        }
        discountAmount = Math.min(discountAmount, originalAmount);
        totalAmount = originalAmount - discountAmount;
      } else {
        // New total is below the promo minimum — remove the promo entirely
        promoRemoved = true;
      }
    }

    const updates = {
      items,
      totalItems,
      originalAmount: promoRemoved ? deleteField() : originalAmount,
      totalAmount: promoRemoved ? originalAmount : totalAmount,
      updatedAt: serverTimestamp()
    };

    if (existing.promoCode) {
      if (promoRemoved) {
        updates.promoCode = deleteField();
        updates.discountAmount = deleteField();
        updates.discountType = deleteField();
        updates.discountValue = deleteField();
        updates.originalAmount = deleteField();
      } else {
        updates.discountAmount = discountAmount;
        updates.originalAmount = originalAmount;
      }
    }

    await updateDoc(docRef, updates);

    return {
      id: orderId,
      items,
      totalItems,
      originalAmount: promoRemoved ? undefined : originalAmount,
      totalAmount: promoRemoved ? originalAmount : totalAmount,
      discountAmount: promoRemoved ? 0 : discountAmount,
      promoRemoved
    };
  } catch (error) {
    console.error('Error updating order items:', error);
    throw error;
  }
}

/**
 * Generate order page URL
 */
export function getOrderUrl(docId) {
  // Using window.location.origin for dynamic base URL
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : '';

  // Detect if app is served from a sub-path (e.g. /rosary-site-react on GitHub Pages)
  let basePath = '';
  if (typeof window !== 'undefined') {
    const path = window.location.pathname || '';
    if (path.startsWith('/rosary-site-react')) {
      basePath = '/rosary-site-react';
    }
  }

  return `${baseUrl}${basePath}/order/${docId}`;
}

/**
 * Delete an order (admin)
 */
export async function deleteOrder(orderId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, orderId);
    await deleteDoc(docRef);
    return { id: orderId };
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
}
