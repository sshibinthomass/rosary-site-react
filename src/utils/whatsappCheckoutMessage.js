export function buildWhatsAppCheckoutMessage(
  cartItems,
  total,
  userInfo = {},
  orderUrl = '',
  orderId = '',
  promoInfo = null,
  currency = 'INR '
) {
  const {
    name = 'Customer',
    address = '',
    phone = '',
    whatsapp = '',
    pincode = '',
    district = '',
    state = '',
  } = userInfo;

  const itemsList = cartItems
    .map((item, index) => {
      const subtotal = item.price * item.quantity;
      const plantId = item.productId || item.id || index + 1;
      return `${plantId}. ${item.name}- ${currency}${item.price} * ${item.quantity} = ${currency}${subtotal}`;
    })
    .join('\n');

  const totalPlants = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const summaryLine = cartItems
    .map((item, index) => {
      const plantId = item.productId || item.id || index + 1;
      return `${plantId}-${item.quantity}`;
    })
    .join(',');

  let fullAddress = address;
  if (district || state || pincode) {
    const parts = [district, state, pincode].filter(Boolean).join(', ');
    if (parts) fullAddress += `\n${parts}`;
  }

  let promoLines = '';
  if (promoInfo && promoInfo.discount > 0) {
    const discountLabel = promoInfo.type === 'percentage'
      ? `${promoInfo.value}% off`
      : `${currency}${promoInfo.value} off`;
    promoLines = `\nSubtotal= ${currency}${subtotal.toLocaleString('en-IN')}\nPromo Code: ${promoInfo.code} (${discountLabel}) -${currency}${promoInfo.discount.toLocaleString('en-IN')}`;
  }

  const orderLines = [`Order ID: ${orderId}`];
  if (orderUrl) {
    orderLines.push(`*View Order:* ${orderUrl}`);
  }

  return `Hello, I have chosen the following plants from your site

${itemsList}

Total Plants= ${totalPlants}${promoLines}
Total Price=${currency}${total.toLocaleString('en-IN')} (delivery additional)

${summaryLine}

*Customer Details:*
Name: ${name}
${phone ? `Phone: ${phone}` : ''}
${whatsapp ? `WhatsApp: ${whatsapp}` : ''}
${address ? `Address:\n${fullAddress}` : ''}

---
${orderLines.join('\n')}`;
}
