export const CHECKOUT_ATTEMPT_API_PATH = '/api/checkout-attempts';

export class CheckoutAttemptTransportError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'CheckoutAttemptTransportError';
    this.status = options.status || 0;
    this.code = options.code || 'checkout-diagnostic-request-failed';
    this.classification = options.classification || 'retryable';
  }
}

export function classifyCheckoutAttemptFailure(error) {
  if (error?.classification === 'permanent' || error?.classification === 'retryable') {
    return error.classification;
  }
  const status = Number(error?.status);
  if (status === 429 || status >= 500 || !Number.isInteger(status) || status <= 0) {
    return 'retryable';
  }
  return 'permanent';
}

async function readResponseBody(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export function createCheckoutAttemptTransport(fetchImpl = globalThis.fetch) {
  if (!(fetchImpl instanceof Function)) {
    throw new TypeError('A fetch implementation is required for checkout diagnostics.');
  }

  return {
    async persist(operation, authorization = {}) {
      if (!authorization.writerIdToken) {
        throw new CheckoutAttemptTransportError('Checkout diagnostic authorization is unavailable.', {
          status: 0,
          code: 'missing-writer-id-token',
          classification: 'permanent',
        });
      }
      const method = operation?.type === 'create'
        ? 'POST'
        : operation?.type === 'update'
          ? 'PATCH'
          : '';
      if (!method) {
        throw new CheckoutAttemptTransportError('Checkout diagnostic operation is invalid.', {
          status: 0,
          code: 'invalid-operation',
          classification: 'permanent',
        });
      }
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorization.writerIdToken}`,
      };
      if (authorization.primaryUserIdToken) {
        headers['X-Checkout-User-Token'] = authorization.primaryUserIdToken;
      }

      let response;
      try {
        response = await fetchImpl(CHECKOUT_ATTEMPT_API_PATH, {
          method,
          headers,
          body: JSON.stringify(operation.payload),
        });
      } catch {
        throw new CheckoutAttemptTransportError('Checkout diagnostics are temporarily unavailable.', {
          status: 0,
          code: 'network-request-failed',
          classification: 'retryable',
        });
      }

      const body = await readResponseBody(response);
      if (!response.ok) {
        const classification = classifyCheckoutAttemptFailure({ status: response.status });
        throw new CheckoutAttemptTransportError(
          typeof body?.error?.message === 'string'
            ? body.error.message
            : 'Checkout diagnostic request failed.',
          {
            status: response.status,
            code: typeof body?.error?.code === 'string'
              ? body.error.code
              : 'checkout-diagnostic-request-failed',
            classification,
          },
        );
      }
      return body;
    },
  };
}
