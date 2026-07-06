import { WHATSAPP_NUMBER, CURRENCY } from '../config/constants.js';
import { buildWhatsAppCheckoutMessage } from './whatsappCheckoutMessage.js';

export function generateWhatsAppOrderRequestUrl(
  cartItems,
  total,
  userInfo = {},
  orderUrl = '',
  orderId = '',
  promoInfo = null
) {
  const message = buildWhatsAppCheckoutMessage(
    cartItems,
    total,
    userInfo,
    orderUrl,
    orderId,
    promoInfo,
    CURRENCY
  );

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
}

export function buildWhatsAppUrlForOrder(order = {}, orderUrl = '') {
  const items = Array.isArray(order.items) ? order.items : [];
  const total = Number.isFinite(Number(order.totalAmount))
    ? Number(order.totalAmount)
    : items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const promoInfo = order.promoCode
    ? {
        code: order.promoCode,
        discount: Number(order.discountAmount) || 0,
        type: order.discountType || null,
        value: Number(order.discountValue) || 0,
      }
    : null;

  return generateWhatsAppOrderRequestUrl(
    items,
    total,
    order.customer || {},
    orderUrl || order.orderUrl || '',
    order.orderId || order.id || '',
    promoInfo
  );
}
