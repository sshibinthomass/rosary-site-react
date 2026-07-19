export async function runVerifiedCheckout(input, dependencies) {
  const track = async (method, ...args) => {
    try {
      await dependencies.tracker?.[method]?.(...args);
    } catch (trackingError) {
      console.warn('Checkout tracking warning:', trackingError);
    }
  };

  try {
    await track('stage', 'details_validated');
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
    await track('stage', 'order_saved', { order: createdOrder });

    const verifiedOrder = await dependencies.verifyOrder(createdOrder.id);
    const isExactOrder = verifiedOrder
      && verifiedOrder.id === createdOrder.id
      && verifiedOrder.orderId === createdOrder.orderId;

    if (!isExactOrder) {
      throw new Error('Order could not be verified after saving');
    }
    await track('stage', 'order_verified');

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

    let whatsappOpened = true;
    let whatsappError;

    try {
      await dependencies.openExternalUrl(whatsappUrl);
      await track('stage', 'whatsapp_opened');
      await track('complete');
    } catch (error) {
      whatsappOpened = false;
      whatsappError = error instanceof Error ? error.message : String(error);
      await track('fail', error);
    }

    const result = {
      order: verifiedOrder,
      orderUrl,
      whatsappUrl,
      savedToFirestore: true,
      whatsappOpened,
      attemptId: dependencies.tracker?.attemptId,
      supportCode: dependencies.tracker?.supportCode,
    };

    if (whatsappError) {
      result.whatsappError = whatsappError;
    }

    return result;
  } catch (error) {
    await track('fail', error);
    throw error;
  }
}
