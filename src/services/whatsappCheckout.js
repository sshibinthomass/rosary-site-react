import { WHATSAPP_NUMBER, CURRENCY } from '../config/constants';

/**
 * Generate WhatsApp checkout URL with pre-filled order message
 * @param {Array} cartItems - Array of cart items
 * @param {number} total - Total price
 * @param {Object} userInfo - User name and address details
 * @returns {string} WhatsApp URL
 */
export function generateWhatsAppCheckoutUrl(cartItems, total, userInfo = {}) {
  const { 
    name = 'Customer', 
    address = '',
    phone = '',
    whatsapp = '',
    pincode = '',
    district = '',
    state = ''
  } = userInfo;
  
  // Format cart items
  const itemsList = cartItems
    .map(item => `• ${item.name} (x${item.quantity}) - ${CURRENCY}${item.price * item.quantity}`)
    .join('\n');
  
  // Format Full Address
  let fullAddress = address;
  if (district || state || pincode) {
    const parts = [district, state, pincode].filter(Boolean).join(', ');
    if (parts) fullAddress += `\n${parts}`;
  }

  // Build message
  const message = `🌿 *New Order from Rosary Plant House*

Hello! I would like to place an order:

*Items:*
${itemsList}

*Total: ${CURRENCY}${total.toLocaleString('en-IN')}*

*Customer Details:*
Name: ${name}
${phone ? `Phone: ${phone}` : ''}
${whatsapp ? `WhatsApp: ${whatsapp}` : ''}
${address ? `Address:\n${fullAddress}` : ''}

Please confirm availability and payment details. Thank you! 🪴`;

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
}

/**
 * Open WhatsApp with checkout message
 */
export function initiateWhatsAppCheckout(cartItems, total, userInfo) {
  const url = generateWhatsAppCheckoutUrl(cartItems, total, userInfo);
  window.open(url, '_blank');
  return url;
}
