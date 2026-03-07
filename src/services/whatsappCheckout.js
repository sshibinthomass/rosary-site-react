import { WHATSAPP_NUMBER, CURRENCY } from '../config/constants';
import { createOrder, getOrderUrl } from './orderService';
import { incrementPromoUsage } from './promoService';

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
  const { 
    name = 'Customer', 
    address = '',
    phone = '',
    whatsapp = '',
    pincode = '',
    district = '',
    state = ''
  } = userInfo;
  
  // Format cart items with plant ID and price calculations
  const itemsList = cartItems
    .map((item, index) => {
      const subtotal = item.price * item.quantity;
      const plantId = item.productId || item.id || index + 1;
      return `${plantId}. ${item.name}- ${CURRENCY}${item.price} * ${item.quantity} = ${CURRENCY}${subtotal}`;
    })
    .join('\n');
  
  // Calculate total plants count
  const totalPlants = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate subtotal before discount
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Generate summary line using plant IDs (e.g., "10-4,13-1")
  const summaryLine = cartItems
    .map((item, index) => {
      const plantId = item.productId || item.id || index + 1;
      return `${plantId}-${item.quantity}`;
    })
    .join(',');
  
  // Format Full Address
  let fullAddress = address;
  if (district || state || pincode) {
    const parts = [district, state, pincode].filter(Boolean).join(', ');
    if (parts) fullAddress += `\n${parts}`;
  }

  // Build promo line if applicable
  let promoLines = '';
  if (promoInfo && promoInfo.discount > 0) {
    const discountLabel = promoInfo.type === 'percentage'
      ? `${promoInfo.value}% off`
      : `${CURRENCY}${promoInfo.value} off`;
    promoLines = `\nSubtotal= ${CURRENCY}${subtotal.toLocaleString('en-IN')}\nPromo Code: ${promoInfo.code} (${discountLabel}) -${CURRENCY}${promoInfo.discount.toLocaleString('en-IN')}`;
  }

  // Build message
  const message = `Hello, I have chosen the following plants from your site

${itemsList}

Total Plants= ${totalPlants}${promoLines}
Total Price=${CURRENCY}${total.toLocaleString('en-IN')} (delivery additional)

${summaryLine}

*Customer Details:*
Name: ${name}
${phone ? `Phone: ${phone}` : ''}
${whatsapp ? `WhatsApp: ${whatsapp}` : ''}
${address ? `Address:\n${fullAddress}` : ''}

---
📋 *Order ID:* ${orderId}
🔗 *View Order:* ${orderUrl}`;

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
}

/**
 * Create order in database and open WhatsApp with checkout message
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

    // Create order in database
    const order = await createOrder({
      items: cartItems,
      totalAmount: total,
      originalAmount,
      customerInfo: userInfo,
      userId: userId,
      ...(promoInfo?.code ? {
        promoCode: promoInfo.code,
        discountAmount: promoInfo.discount,
        discountType: promoInfo.type,
        discountValue: promoInfo.value
      } : {})
    });

    // Increment promo usage count (fire-and-forget)
    if (promoInfo?.code) {
      incrementPromoUsage(promoInfo.code);
    }
    
    // Get order URL
    const orderUrl = getOrderUrl(order.id);
    
    // Generate WhatsApp URL with order link
    const whatsappUrl = generateWhatsAppCheckoutUrl(
      cartItems, 
      total, 
      userInfo, 
      orderUrl, 
      order.orderId,
      promoInfo
    );
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    return {
      order,
      orderUrl,
      whatsappUrl
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}
