export async function runVerifiedCheckout(input, dependencies) {
  const originalAmount = input.cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const createdOrder = await dependencies.createOrder({
    orderId: dependencies.generateOrderId(),
    items: input.cartItems,
    totalAmount: input.total,
    originalAmount,
    customerInfo: input.userInfo,
    userId: input.userId,
    ...(input.promoInfo?.code ? {
      promoCode: input.promoInfo.code,
      discountAmount: input.promoInfo.discount,
      discountType: input.promoInfo.type,
      discountValue: input.promoInfo.value,
    } : {}),
  });

  const verifiedOrder = await dependencies.verifyOrder(createdOrder.id);
  const isExactOrder = verifiedOrder
    && verifiedOrder.id === createdOrder.id
    && verifiedOrder.orderId === createdOrder.orderId;

  if (!isExactOrder) {
    throw new Error('Order could not be verified after saving');
  }

  const orderUrl = dependencies.getOrderUrl(verifiedOrder.id);
  const whatsappUrl = dependencies.buildWhatsAppUrl(
    input.cartItems,
    input.total,
    input.userInfo,
    orderUrl,
    verifiedOrder.orderId,
    input.promoInfo
  );

  if (input.promoInfo?.code) {
    dependencies.incrementPromoUsage(input.promoInfo.code);
  }

  await dependencies.openExternalUrl(whatsappUrl);

  return {
    order: verifiedOrder,
    orderUrl,
    whatsappUrl,
    savedToFirestore: true,
  };
}
