import { createOrder, generateOrderId, getOrderUrl } from './orderService';
import { incrementPromoUsage } from './promoService';
import { openExternalUrl } from '../utils/externalNavigation';
import { generateWhatsAppOrderRequestUrl } from '../utils/orderWhatsApp';

const ORDER_SAVE_TIMEOUT_MS = 8000;

/**
 * Generate WhatsApp checkout URL with pre-filled order message
 * @param {Array} cartItems - Array of cart items
 * @param {number} total - Final total after discount
 * @param {Object} userInfo - User name and address details
 * @param {string} orderUrl - URL to view order details
 * @param {string} orderId - Unique order ID
 * @param {Object|null} promoInfo - { code, discount, type, value } or null
 * @returns {string} WhatsApp URL
 */
export function generateWhatsAppCheckoutUrl(cartItems, total, userInfo = {}, orderUrl = '', orderId = '', promoInfo = null) {
  return generateWhatsAppOrderRequestUrl(cartItems, total, userInfo, orderUrl, orderId, promoInfo);
}

/**
 * Create order in database and open WhatsApp with checkout message.
 * Falls back to a WhatsApp-only handoff when Firestore is unavailable or slow.
 * @param {Array} cartItems - Array of cart items
 * @param {number} total - Final total (after promo discount)
 * @param {Object} userInfo - User name and address details
 * @param {string|null} userId - User ID if logged in
 * @param {Object|null} promoInfo - { code, discount, type, value, promo } or null
 * @returns {Object} Order details and WhatsApp URL
 */
export async function initiateWhatsAppCheckout(cartItems, total, userInfo, userId = null, promoInfo = null) {
  try {
    const originalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderId = generateOrderId();

    const orderSavePromise = createOrder({
      orderId,
      items: cartItems,
      totalAmount: total,
      originalAmount,
      customerInfo: userInfo,
      userId,
      ...(promoInfo?.code ? {
        promoCode: promoInfo.code,
        discountAmount: promoInfo.discount,
        discountType: promoInfo.type,
        discountValue: promoInfo.value,
      } : {}),
    });

    let order = null;
    let savedToFirestore = false;

    try {
      order = await withTimeout(orderSavePromise, ORDER_SAVE_TIMEOUT_MS);
      savedToFirestore = true;
    } catch (saveError) {
      console.warn('Order could not be saved before WhatsApp handoff:', saveError);
    }

    if (savedToFirestore && promoInfo?.code) {
      incrementPromoUsage(promoInfo.code);
    }

    const orderUrl = order?.id ? getOrderUrl(order.id) : '';
    const whatsappUrl = generateWhatsAppCheckoutUrl(
      cartItems,
      total,
      userInfo,
      orderUrl,
      order?.orderId || orderId,
      promoInfo
    );

    await openExternalUrl(whatsappUrl);

    return {
      order,
      orderUrl,
      whatsappUrl,
      savedToFirestore,
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

function withTimeout(promise, timeoutMs) {
  const setTimer = typeof window !== 'undefined' ? window.setTimeout.bind(window) : setTimeout;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimer(() => reject(new Error('Order save timed out')), timeoutMs);
    }),
  ]);
}
