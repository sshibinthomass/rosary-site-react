export const CHECKOUT_OUTBOX_KEY = 'rosary.checkoutAttemptOutbox.v1';
export const CHECKOUT_OUTBOX_LIMIT = 100;

export function readCheckoutOutbox(storage) {
  try {
    const stored = storage?.getItem(CHECKOUT_OUTBOX_KEY);
    if (!stored) return [];
    const operations = JSON.parse(stored);
    return Array.isArray(operations) ? operations : [];
  } catch {
    return [];
  }
}

export function enqueueCheckoutOperation(storage, operation) {
  if (!operation?.operationId) return false;

  try {
    const operations = readCheckoutOutbox(storage);
    if (operations.some(({ operationId }) => operationId === operation.operationId)) return false;
    const nextOperations = [...operations, operation].slice(-CHECKOUT_OUTBOX_LIMIT);
    storage.setItem(CHECKOUT_OUTBOX_KEY, JSON.stringify(nextOperations));
    return true;
  } catch {
    return false;
  }
}

export function removeCheckoutOperation(storage, operationId) {
  try {
    const operations = readCheckoutOutbox(storage);
    const nextOperations = operations.filter((operation) => operation.operationId !== operationId);
    if (nextOperations.length === operations.length) return false;
    storage.setItem(CHECKOUT_OUTBOX_KEY, JSON.stringify(nextOperations));
    return true;
  } catch {
    return false;
  }
}
