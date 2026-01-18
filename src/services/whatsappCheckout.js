import { WHATSAPP_NUMBER, CURRENCY } from '../config/constants';
import { createOrder, getOrderUrl } from './orderService';

/**
 * Generate WhatsApp checkout URL with pre-filled order message
 * @param {Array} cartItems - Array of cart items
 * @param {number} total - Total price
 * @param {Object} userInfo - User name and address details
 * @param {string} orderUrl - URL to view order details
 * @param {string} orderId - Unique order ID
 * @returns {string} WhatsApp URL
 */
export function generateWhatsAppCheckoutUrl(cartItems, total, userInfo = {}, orderUrl = '', orderId = '') {
  const { 
    name = 'Customer', 
    address = '',
    phone = '',
    whatsapp = '',
    pincode = '',
    district = '',
    state = ''
  } = userInfo;
  
  // Format cart items with numbered list and price calculations
  const itemsList = cartItems
    .map((item, index) => {
      const subtotal = item.price * item.quantity;
      return `${index + 1}. ${item.name}- ${CURRENCY}${item.price} * ${item.quantity} = ${CURRENCY}${subtotal}`;
    })
    .join('\n');
  
  // Calculate total plants count
  const totalPlants = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Generate summary line (e.g., "1-2,2-1,3-1")
  const summaryLine = cartItems
    .map((item, index) => `${index + 1}-${item.quantity}`)
    .join(',');
  
  // Format Full Address
  let fullAddress = address;
  if (district || state || pincode) {
    const parts = [district, state, pincode].filter(Boolean).join(', ');
    if (parts) fullAddress += `\n${parts}`;
  }

  // Build message
  const message = `Hello, I have chosen the following plants from your site

${itemsList}

Total Plants= ${totalPlants}
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
 * @param {number} total - Total price
 * @param {Object} userInfo - User name and address details
 * @param {string|null} userId - User ID if logged in
 * @returns {Object} Order details and WhatsApp URL
 */
export async function initiateWhatsAppCheckout(cartItems, total, userInfo, userId = null) {
  try {
    // Create order in database
    const order = await createOrder({
      items: cartItems,
      totalAmount: total,
      customerInfo: userInfo,
      userId: userId
    });
    
    // Get order URL
    const orderUrl = getOrderUrl(order.id);
    
    // Generate WhatsApp URL with order link
    const whatsappUrl = generateWhatsAppCheckoutUrl(
      cartItems, 
      total, 
      userInfo, 
      orderUrl, 
      order.orderId
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

