export async function runVerifiedCheckout(input, dependencies) {
  const track = async (method, ...args) => {
    try {
      await dependencies.tracker?.[method]?.(...args);
    } catch (trackingError) {
      console.warn('Checkout tracking warning:', trackingError);
    }
  };

  const boundaryError = (error, code, fallbackMessage) => {
    if (error?.code === code) return error;
    const message = error instanceof Error && error.message
      ? error.message
      : fallbackMessage;
    const classified = new Error(message, { cause: error });
    classified.code = code;
    return classified;
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

    let verifiedOrder;
    try {
      verifiedOrder = await dependencies.verifyOrder(createdOrder.id);
    } catch (error) {
      throw boundaryError(error, 'verification-failed', 'Order verification failed.');
    }
    const isExactOrder = verifiedOrder
      && verifiedOrder.id === createdOrder.id
      && verifiedOrder.orderId === createdOrder.orderId;

    if (!isExactOrder) {
      const error = new Error('Order could not be verified after saving');
      error.code = 'verification-failed';
      throw error;
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
      const classifiedError = boundaryError(
        error,
        'whatsapp-launch-failed',
        'WhatsApp could not be opened.',
      );
      whatsappOpened = false;
      whatsappError = classifiedError.message;
      await track('fail', classifiedError);
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

    if (!whatsappOpened && typeof dependencies.tracker?.recordWhatsAppRetry === 'function') {
      Object.defineProperty(result, 'recordWhatsAppRetry', {
        value: (retry) => dependencies.tracker.recordWhatsAppRetry(retry),
        enumerable: false,
      });
    }

    return result;
  } catch (error) {
    await track('fail', error);
    throw error;
  }
}
