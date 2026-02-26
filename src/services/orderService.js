import { 
  collection, 
  doc, 
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
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
    
    const order = {
      orderId,
      items: orderData.items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl || null
      })),
      totalAmount: orderData.totalAmount,
      totalItems: orderData.items.reduce((sum, item) => sum + item.quantity, 0),
      
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
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), order);
    
    return {
      id: docRef.id,
      orderId,
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
 * Generate order page URL
 */
export function getOrderUrl(docId) {
  // Using window.location.origin for dynamic base URL
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : '';
  return `${baseUrl}/rosary-site-react/order/${docId}`;
}

