import { createCheckoutAttemptsHandler } from './checkout-attempts-core.js';
import { createFirebaseCheckoutAttemptRepository } from './checkout-attempts-firebase.js';
import { getFirebaseAdminServices } from './firebase-admin.js';

export const config = {
  api: {
    bodyParser: { sizeLimit: '32kb' },
  },
};

let productionHandler;

function getProductionHandler() {
  if (productionHandler) return productionHandler;
  const { firestore, verifyIdToken } = getFirebaseAdminServices();
  productionHandler = createCheckoutAttemptsHandler({
    repository: createFirebaseCheckoutAttemptRepository(firestore),
    verifyIdToken,
  });
  return productionHandler;
}

export default async function checkoutAttemptsEndpoint(request, response) {
  let result;
  try {
    result = await getProductionHandler()(request);
  } catch {
    result = {
      status: 500,
      body: {
        error: {
          code: 'server-configuration-error',
          message: 'Checkout diagnostics are temporarily unavailable.',
          retryable: true,
        },
      },
    };
  }

  for (const [name, value] of Object.entries(result.headers || {})) {
    response.setHeader(name, value);
  }
  response.status(result.status).json(result.body);
}
