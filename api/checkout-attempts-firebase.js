function toIsoString(value) {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (value?.toDate instanceof Function) return value.toDate().toISOString();
  return value;
}

export function serializeCheckoutAttempt(document) {
  return {
    ...document,
    createdAt: new Date(document.createdAt),
    updatedAt: new Date(document.updatedAt),
    expiresAt: new Date(document.expiresAt),
    ...(document.resolvedAt ? { resolvedAt: new Date(document.resolvedAt) } : {}),
    events: (document.events || []).map((event) => ({
      ...event,
      occurredAt: new Date(event.occurredAt),
    })),
  };
}

export function deserializeCheckoutAttempt(document) {
  return {
    ...document,
    createdAt: toIsoString(document.createdAt),
    updatedAt: toIsoString(document.updatedAt),
    expiresAt: toIsoString(document.expiresAt),
    ...(document.resolvedAt ? { resolvedAt: toIsoString(document.resolvedAt) } : {}),
    events: (document.events || []).map((event) => ({
      ...event,
      occurredAt: toIsoString(event.occurredAt),
    })),
  };
}

export function createFirebaseCheckoutAttemptRepository(firestore) {
  if (!(firestore?.runTransaction instanceof Function)) {
    throw new TypeError('A Firebase Admin Firestore instance is required.');
  }

  return {
    transact(attemptId, mutate) {
      const reference = firestore.collection('checkoutAttempts').doc(attemptId);
      return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        const existing = snapshot.exists
          ? deserializeCheckoutAttempt(snapshot.data())
          : null;
        const decision = await mutate(existing);
        if (decision.document) {
          transaction.set(reference, serializeCheckoutAttempt(decision.document));
        }
        return decision.response;
      });
    },
  };
}
