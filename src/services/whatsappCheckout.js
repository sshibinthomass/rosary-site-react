import { createOrder, generateOrderId, getOrderByIdFromServer, getOrderUrl } from './orderService';
import { incrementPromoUsage } from './promoService';
import { closeExternalUrlReservation, openExternalUrl } from '../utils/externalNavigation';
import { generateWhatsAppOrderRequestUrl } from '../utils/orderWhatsApp';
import { runVerifiedCheckout } from './verifiedCheckout';
import { createCheckoutTracker } from './checkoutAttemptService';

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
 * @param {Object|null} externalUrlReservation - Synchronously reserved browser handoff target
 * @returns {Object} Order details and WhatsApp URL
 */
export async function initiateWhatsAppCheckout(
  cartItems,
  total,
  userInfo,
  userId = null,
  promoInfo = null,
  externalUrlReservation = null,
) {
  let tracker;
  try {
    tracker = await createCheckoutTracker({
      items: cartItems,
      totalAmount: total,
      customer: {
        name: userInfo?.name,
        phone: userInfo?.phone,
        whatsapp: userInfo?.whatsapp,
      },
      userId,
    });
  } catch (trackingError) {
    console.warn('Checkout tracking warning:', trackingError);
  }

  try {
    return await runVerifiedCheckout({
      cartItems,
      total,
      userInfo,
      userId,
      promoInfo,
      externalUrlReservation,
    }, {
      createOrder,
      generateOrderId,
      verifyOrder: getOrderByIdFromServer,
      getOrderUrl,
      buildWhatsAppUrl: generateWhatsAppCheckoutUrl,
      incrementPromoUsage,
      openExternalUrl,
      closeExternalUrlReservation,
      tracker,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    try {
      const canAnnotate = error !== null
        && (typeof error === 'object' || typeof error === 'function')
        && Object.isExtensible(error);
      if (canAnnotate) {
        error.attemptId = tracker?.attemptId;
        error.supportCode = tracker?.supportCode;
      }
    } catch {
      // Diagnostic metadata must never replace the original business failure.
    }
    throw error;
  }
}
