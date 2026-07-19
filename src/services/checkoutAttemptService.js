import {
  Timestamp,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  CHECKOUT_STAGES,
  RESOLUTION_STATUSES,
  createCheckoutAttempt,
  createCheckoutEvent,
  sanitizeCheckoutItems,
  sanitizeCheckoutError,
} from '../utils/checkoutAttemptModel.js';
import {
  enqueueCheckoutOperation,
  readCheckoutOutbox,
  removeCheckoutOperation,
} from '../utils/checkoutAttemptOutbox.js';

const COLLECTION_NAME = 'checkoutAttempts';
export const CHECKOUT_TRACKING_DEADLINE_MS = 750;
export const CHECKOUT_ITEMS_JSON_MAX_BYTES = 12_000;

async function getDatabase() {
  const { db } = await import('../config/firebase.js');
  return db;
}

function toTimestamp(value) {
  if (value instanceof Timestamp) return value;
  return Timestamp.fromDate(new Date(value));
}

function toFirestoreEvent(event) {
  return {
    ...event,
    occurredAt: toTimestamp(event.occurredAt),
  };
}

function toFirestoreCreatePayload(payload) {
  const { items, itemsJson, ...fields } = payload;
  return {
    ...fields,
    itemsJson: typeof itemsJson === 'string'
      ? encodeCheckoutItems(decodeCheckoutItems(itemsJson))
      : encodeCheckoutItems(items),
    createdAt: toTimestamp(payload.createdAt),
    updatedAt: toTimestamp(payload.updatedAt),
    expiresAt: toTimestamp(payload.expiresAt),
    events: payload.events.map(toFirestoreEvent),
  };
}

function toFirestoreUpdatePayload(payload) {
  const { events, ...fields } = payload;
  const converted = {
    ...fields,
    ...(fields.updatedAt ? { updatedAt: toTimestamp(fields.updatedAt) } : {}),
  };

  if (events?.length) {
    converted.events = arrayUnion(...events.map(toFirestoreEvent));
  }

  return converted;
}

async function persistCreateOperation(operation) {
  const database = await getDatabase();
  await setDoc(
    doc(database, COLLECTION_NAME, operation.attemptId),
    toFirestoreCreatePayload(operation.payload),
  );
}

async function persistUpdateOperation(operation) {
  const database = await getDatabase();
  await updateDoc(
    doc(database, COLLECTION_NAME, operation.attemptId),
    toFirestoreUpdatePayload(operation.payload),
  );
}

async function fetchAllAttempts() {
  const database = await getDatabase();
  const snapshot = await getDocs(query(
    collection(database, COLLECTION_NAME),
    orderBy('createdAt', 'desc'),
  ));
  return snapshot.docs.map((snapshotDocument) => ({
    id: snapshotDocument.id,
    ...snapshotDocument.data(),
  }));
}

async function persistResolution(id, updates) {
  const database = await getDatabase();
  await updateDoc(doc(database, COLLECTION_NAME, id), {
    ...updates,
    updatedAt: serverTimestamp(),
    resolvedAt: updates.resolutionStatus === 'resolved' ? serverTimestamp() : deleteField(),
  });
}

const productionPersistence = {
  persistCreate: persistCreateOperation,
  persistUpdate: persistUpdateOperation,
  fetchAll: fetchAllAttempts,
  updateResolution: persistResolution,
};

function getBrowserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function defaultEnqueue(operation) {
  return enqueueCheckoutOperation(getBrowserStorage(), operation);
}

function orderLinks(order = {}) {
  return {
    linkedOrderDocumentId: String(order.id || order.documentId || ''),
    linkedOrderId: String(order.orderId || ''),
  };
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function encodedByteLength(value) {
  return new TextEncoder().encode(value).length;
}

function encodeCheckoutItems(items) {
  const encodedItems = [];
  for (const item of sanitizeCheckoutItems(items)) {
    const candidate = JSON.stringify([...encodedItems, item]);
    if (encodedByteLength(candidate) > CHECKOUT_ITEMS_JSON_MAX_BYTES) break;
    encodedItems.push(item);
  }
  return JSON.stringify(encodedItems);
}

function decodeCheckoutItems(itemsJson) {
  if (typeof itemsJson !== 'string') return [];
  try {
    return sanitizeCheckoutItems(JSON.parse(itemsJson));
  } catch {
    return [];
  }
}

async function settlePersistence(persist, operation, deadlineMs) {
  let timeoutId;
  const persistence = Promise.resolve()
    .then(() => persist(operation))
    .then(() => true, () => false);
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(false), deadlineMs);
  });

  try {
    return await Promise.race([persistence, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resolveWithinDeadline(operationPromise, deadlineMs) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(resolve, deadlineMs);
  });

  try {
    await Promise.race([operationPromise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function createCheckoutTrackerSession(input, dependencies = {}) {
  const generators = dependencies.generators || {};
  const now = generators.now || (() => new Date());
  const randomUUID = generators.randomUUID || globalThis.crypto.randomUUID.bind(globalThis.crypto);
  const persistCreate = dependencies.persistCreate || productionPersistence.persistCreate;
  const persistUpdate = dependencies.persistUpdate || productionPersistence.persistUpdate;
  const enqueue = dependencies.enqueue || defaultEnqueue;
  const persistenceDeadlineMs = Number.isFinite(dependencies.persistenceDeadlineMs)
    ? Math.max(1, dependencies.persistenceDeadlineMs)
    : CHECKOUT_TRACKING_DEADLINE_MS;
  const attempt = createCheckoutAttempt(input, generators);
  const initialEvent = createCheckoutEvent('started', { eventId: randomUUID() }, now);
  const { id, clientToken } = attempt;
  const createOperation = {
    operationId: `${id}:create`,
    attemptId: id,
    type: 'create',
    payload: toPlainJson({
      supportCode: attempt.supportCode,
      clientWriteToken: clientToken,
      orderId: attempt.orderId,
      customer: attempt.customer,
      delivery: attempt.delivery,
      totalAmount: attempt.totalAmount,
      itemsJson: encodeCheckoutItems(attempt.items),
      currentStage: attempt.currentStage,
      result: attempt.result,
      resolutionStatus: attempt.resolutionStatus,
      createdAt: attempt.createdAt,
      expiresAt: attempt.expiresAt,
      updatedAt: attempt.createdAt,
      events: [initialEvent],
    }),
  };

  async function persistWithoutRejecting(operation, persist) {
    const persisted = await settlePersistence(persist, operation, persistenceDeadlineMs);
    if (!persisted) {
      try {
        await enqueue(operation);
      } catch {
        // Tracking must never interrupt checkout, even if local storage is blocked.
      }
      return false;
    }
    return true;
  }

  const createPersisted = await persistWithoutRejecting(createOperation, persistCreate);

  let currentStage = attempt.currentStage;
  let result = attempt.result;
  let hasDeferredOperation = !createPersisted;
  let persistenceChain = Promise.resolve();

  function queueUpdate(payload, operationId) {
    const deadlineAt = Date.now() + persistenceDeadlineMs;
    const operation = {
      operationId,
      attemptId: id,
      type: 'update',
      payload: toPlainJson(payload),
    };
    const operationPromise = persistenceChain
      .then(async () => {
        const remainingMs = deadlineAt - Date.now();
        if (hasDeferredOperation || remainingMs <= 0) {
          hasDeferredOperation = true;
          try {
            await enqueue(operation);
          } catch {
            // Tracking must never interrupt checkout, even if local storage is blocked.
          }
          return;
        }

        const persisted = await settlePersistence(persistUpdate, operation, remainingMs);
        if (!persisted) {
          try {
            await enqueue(operation);
          } catch {
            // Tracking must never interrupt checkout, even if local storage is blocked.
          }
        }
        if (!persisted) hasDeferredOperation = true;
      })
      .catch(() => undefined);
    persistenceChain = operationPromise;
    return resolveWithinDeadline(operationPromise, persistenceDeadlineMs);
  }

  function stage(stageName, details = {}) {
    if (!CHECKOUT_STAGES.includes(stageName)) return Promise.resolve();
    currentStage = stageName;
    const event = createCheckoutEvent(stageName, {
      eventId: randomUUID(),
      outcome: details.outcome,
      error: details.error,
    }, now);
    const links = stageName === 'order_saved' ? orderLinks(details.order) : {};
    return queueUpdate({
      currentStage,
      updatedAt: now().toISOString(),
      ...links,
      events: [event],
    }, `${id}:event:${event.eventId}`);
  }

  function fail(error) {
    result = 'failed';
    const sanitizedError = sanitizeCheckoutError(error);
    const event = createCheckoutEvent(currentStage, {
      eventId: randomUUID(),
      outcome: 'failed',
      error,
    }, now);
    return queueUpdate({
      currentStage,
      result,
      error: sanitizedError,
      updatedAt: now().toISOString(),
      events: [event],
    }, `${id}:event:${event.eventId}`);
  }

  function linkOrder(order) {
    return queueUpdate({
      ...orderLinks(order),
      updatedAt: now().toISOString(),
    }, `${id}:link:${randomUUID()}`);
  }

  function complete() {
    currentStage = 'completed';
    result = 'successful';
    const event = createCheckoutEvent('completed', { eventId: randomUUID() }, now);
    return queueUpdate({
      currentStage,
      result,
      updatedAt: now().toISOString(),
      events: [event],
    }, `${id}:event:${event.eventId}`);
  }

  return {
    attemptId: id,
    supportCode: attempt.supportCode,
    stage,
    fail,
    linkOrder,
    complete,
  };
}

export function createCheckoutTracker(input) {
  return createCheckoutTrackerSession(input);
}

export async function flushCheckoutAttemptOutbox(storage, persistence = productionPersistence) {
  let flushed = 0;
  const operations = readCheckoutOutbox(storage);

  for (const operation of operations) {
    try {
      if (operation.type === 'create') {
        await persistence.persistCreate(operation);
      } else if (operation.type === 'update') {
        await persistence.persistUpdate(operation);
      } else {
        throw new Error(`Unknown checkout outbox operation: ${operation.type}`);
      }
      if (!removeCheckoutOperation(storage, operation.operationId)) break;
      flushed += 1;
    } catch {
      break;
    }
  }

  return { flushed, remaining: readCheckoutOutbox(storage).length };
}

function toIsoString(value) {
  if (value?.toDate instanceof Function) return value.toDate().toISOString();
  return value;
}

export async function getAllCheckoutAttempts(persistence = productionPersistence) {
  const attempts = await persistence.fetchAll();
  return attempts.map((attempt) => {
    const {
      clientWriteToken: _clientWriteToken,
      itemsJson,
      ...safeAttempt
    } = attempt;
    return {
      ...safeAttempt,
      items: decodeCheckoutItems(itemsJson),
      ...('createdAt' in safeAttempt ? { createdAt: toIsoString(safeAttempt.createdAt) } : {}),
      ...('updatedAt' in safeAttempt ? { updatedAt: toIsoString(safeAttempt.updatedAt) } : {}),
      ...('expiresAt' in safeAttempt ? { expiresAt: toIsoString(safeAttempt.expiresAt) } : {}),
      ...('resolvedAt' in safeAttempt ? { resolvedAt: toIsoString(safeAttempt.resolvedAt) } : {}),
      ...(safeAttempt.events ? {
        events: safeAttempt.events.map((event) => ({
          ...event,
          occurredAt: toIsoString(event.occurredAt),
        })),
      } : {}),
    };
  });
}

export async function updateCheckoutAttemptResolution(id, input, persistence = productionPersistence) {
  if (!RESOLUTION_STATUSES.includes(input?.resolutionStatus)) {
    throw new TypeError('Invalid checkout attempt resolution status.');
  }

  const updates = {
    resolutionStatus: input.resolutionStatus,
    adminNotes: String(input.adminNotes ?? '').trim().slice(0, 2_000),
  };
  await persistence.updateResolution(id, updates);
  return { id, ...updates };
}
