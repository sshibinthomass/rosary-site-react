/** Order statuses that mean the order is on its way but not yet delivered. */
export const ACTIVE_STATUSES = Object.freeze(['confirmed', 'shipped']);

/** Statuses a customer never sees in their own order history. */
export const HIDDEN_CUSTOMER_STATUSES = Object.freeze(['pending', 'cancelled']);

export function isActiveOrder(order = {}) {
  return ACTIVE_STATUSES.includes(order.status);
}

export function isPlacedOrder(order = {}) {
  return !HIDDEN_CUSTOMER_STATUSES.includes(order.status);
}
