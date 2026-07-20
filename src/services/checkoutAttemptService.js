import {
  collection,
  deleteField,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import {
  CHECKOUT_STAGES,
  RESOLUTION_STATUSES,
  createCheckoutAttempt,
  createCheckoutEvent,
  sanitizeCheckoutError,
  sanitizeCheckoutItems,
} from '../utils/checkoutAttemptModel.js';
import {
  enqueueCheckoutAttemptGroup,
  pruneCheckoutOutbox,
  readCheckoutOutbox,
  removeCheckoutAttemptGroup,
} from '../utils/checkoutAttemptOutbox.js';
import {
  classifyCheckoutAttemptFailure,
  createCheckoutAttemptTransport,
} from '../utils/checkoutAttemptTransport.js';

const COLLECTION_NAME = 'checkoutAttempts';
export const CHECKOUT_TRACKING_DEADLINE_MS = 750;
const IDENTITY_DEADLINE_MS = 250;

const authorizationSessions = new Map();
let productionTransport;

async function getDatabase() {
  const { db } = await import('../config/firebase.js');
  return db;
}

async function getDefaultIdentity(requestedUserId) {
  const { auth } = await import('../config/firebaseAuth.js');
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== requestedUserId) return null;
  const firebaseIdToken = await currentUser.getIdToken();
  return { userId: currentUser.uid, firebaseIdToken };
}

async function persistApiOperation(operation, authorization) {
  productionTransport ||= createCheckoutAttemptTransport();
  return productionTransport.persist(operation, authorization);
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
  persistOperation: persistApiOperation,
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

function defaultEnqueueGroup(group) {
  return enqueueCheckoutAttemptGroup(getBrowserStorage(), group);
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function orderLinks(order = {}) {
  return {
    linkedOrderDocumentId: String(order.id || order.documentId || '').slice(0, 128),
    linkedOrderId: String(order.orderId || '').slice(0, 128),
  };
}

function resolveWithinDeadline(promise, deadlineMs) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(resolve, deadlineMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function settlePersistence(persist, operation, authorization, deadlineMs) {
  let timeoutId;
  const persistence = Promise.resolve()
    .then(() => persist(operation, authorization))
    .then(
      () => ({ outcome: 'success' }),
      (error) => ({ outcome: classifyCheckoutAttemptFailure(error), error }),
    );
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve({ outcome: 'retryable', timedOut: true }), deadlineMs);
  });
  try {
    return await Promise.race([persistence, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resolveIdentity(requestedUserId, getIdentity, deadlineMs) {
  if (!requestedUserId) return null;
  let timeoutId;
  const identity = Promise.resolve()
    .then(() => getIdentity(requestedUserId))
    .then((result) => (
      result?.userId === requestedUserId && typeof result.firebaseIdToken === 'string'
        ? { userId: requestedUserId, firebaseIdToken: result.firebaseIdToken }
        : null
    ))
    .catch(() => null);
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(null), Math.min(deadlineMs, IDENTITY_DEADLINE_MS));
  });
  try {
    return await Promise.race([identity, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function createOperationPersistence(dependencies) {
  if (dependencies.persistOperation) return dependencies.persistOperation;
  if (dependencies.persistCreate || dependencies.persistUpdate) {
    return (operation, authorization) => (
      operation.type === 'create'
        ? dependencies.persistCreate?.(operation, authorization)
        : dependencies.persistUpdate?.(operation, authorization)
    );
  }
  return productionPersistence.persistOperation;
}

export async function createCheckoutTrackerSession(input, dependencies = {}) {
  const generators = dependencies.generators || {};
  const now = generators.now || (() => new Date());
  const randomUUID = generators.randomUUID || globalThis.crypto.randomUUID.bind(globalThis.crypto);
  const persistOperation = createOperationPersistence(dependencies);
  const enqueueGroup = dependencies.enqueueGroup || defaultEnqueueGroup;
  const getIdentity = dependencies.getIdentity || getDefaultIdentity;
  const persistenceDeadlineMs = Number.isFinite(dependencies.persistenceDeadlineMs)
    ? Math.max(1, dependencies.persistenceDeadlineMs)
    : CHECKOUT_TRACKING_DEADLINE_MS;
  const attempt = createCheckoutAttempt(input, generators);
  const initialEvent = createCheckoutEvent('started', { eventId: randomUUID() }, now);
  const identity = await resolveIdentity(input?.userId, getIdentity, persistenceDeadlineMs);
  const { id, capabilityToken } = attempt;
  const authorization = {
    capabilityToken,
    ...(identity ? { firebaseIdToken: identity.firebaseIdToken } : {}),
  };
  authorizationSessions.set(id, authorization);

  const createOperation = {
    operationId: `${id}:create`,
    attemptId: id,
    type: 'create',
    payload: toPlainJson({
      attemptId: id,
      operationId: `${id}:create`,
      supportCode: attempt.supportCode,
      customer: attempt.customer,
      items: attempt.items,
      totalAmount: attempt.totalAmount,
      currentStage: attempt.currentStage,
      result: attempt.result,
      createdAt: attempt.createdAt,
      updatedAt: attempt.createdAt,
      expiresAt: attempt.expiresAt,
      event: initialEvent,
      ...(identity ? { userId: identity.userId } : {}),
    }),
  };

  const deferredOperations = [];
  let hasDeferredOperation = false;
  let persistenceChain = Promise.resolve();
  let currentStage = attempt.currentStage;
  let result = attempt.result;

  async function deferOperation(operation) {
    if (!deferredOperations.some(({ operationId }) => operationId === operation.operationId)) {
      deferredOperations.push(operation);
    }
    const operations = [
      createOperation,
      ...deferredOperations.filter(({ type }) => type !== 'create'),
    ];
    try {
      await enqueueGroup({
        attemptId: id,
        expiresAt: attempt.expiresAt,
        operations: toPlainJson(operations),
      });
    } catch {
      // Diagnostic storage must never affect checkout business behavior.
    }
  }

  const createResult = await settlePersistence(
    persistOperation,
    createOperation,
    authorization,
    persistenceDeadlineMs,
  );
  if (createResult.outcome === 'retryable') {
    hasDeferredOperation = true;
    await deferOperation(createOperation);
  }

  function queueUpdate(payload, eventId) {
    const operation = {
      operationId: `${id}:event:${eventId}`,
      attemptId: id,
      type: 'update',
      payload: toPlainJson({
        attemptId: id,
        operationId: `${id}:event:${eventId}`,
        ...payload,
      }),
    };
    const deadlineAt = Date.now() + persistenceDeadlineMs;
    const operationPromise = persistenceChain.then(async () => {
      const remainingMs = deadlineAt - Date.now();
      if (hasDeferredOperation || remainingMs <= 0) {
        hasDeferredOperation = true;
        await deferOperation(operation);
        return;
      }
      const persistenceResult = await settlePersistence(
        persistOperation,
        operation,
        authorization,
        remainingMs,
      );
      if (persistenceResult.outcome === 'retryable') {
        hasDeferredOperation = true;
        await deferOperation(operation);
      }
    }).catch(() => undefined);
    persistenceChain = operationPromise;
    return resolveWithinDeadline(operationPromise, persistenceDeadlineMs);
  }

  function stage(stageName, details = {}) {
    if (!CHECKOUT_STAGES.includes(stageName)) return Promise.resolve();
    currentStage = stageName;
    result = stageName === 'completed' ? 'successful' : 'in_progress';
    const event = createCheckoutEvent(stageName, { eventId: randomUUID() }, now);
    return queueUpdate({
      currentStage,
      result,
      updatedAt: event.occurredAt,
      event,
      ...(stageName === 'order_saved' ? orderLinks(details.order) : {}),
      ...(details.clearError ? { error: null } : {}),
    }, event.eventId);
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
      updatedAt: event.occurredAt,
      event,
    }, event.eventId);
  }

  function linkOrder(order) {
    if (currentStage === 'order_saved') return Promise.resolve();
    return stage('order_saved', { order });
  }

  function complete() {
    return stage('completed');
  }

  async function recordWhatsAppRetry(retry = {}) {
    if (!retry.success) {
      return fail({
        code: 'whatsapp-launch-failed',
        message: retry.error instanceof Error ? retry.error.message : String(retry.error || ''),
      });
    }
    await stage('whatsapp_opened', { clearError: true });
    await complete();
  }

  return {
    attemptId: id,
    supportCode: attempt.supportCode,
    stage,
    fail,
    linkOrder,
    complete,
    recordWhatsAppRetry,
  };
}

export function createCheckoutTracker(input) {
  return createCheckoutTrackerSession(input);
}

export async function flushCheckoutAttemptOutbox(storage, dependencies = {}) {
  const now = dependencies.now || (() => new Date());
  const persistOperation = dependencies.persistOperation || productionPersistence.persistOperation;
  const getAuthorization = dependencies.getAuthorization
    || ((attemptId) => authorizationSessions.get(attemptId));
  const { groups } = pruneCheckoutOutbox(storage, { now });
  let flushedGroups = 0;
  let droppedGroups = 0;
  let retainedGroups = 0;

  for (const group of groups) {
    const authorization = await getAuthorization(group.attemptId);
    if (!authorization?.capabilityToken) {
      if (removeCheckoutAttemptGroup(storage, group.attemptId)) droppedGroups += 1;
      else retainedGroups += 1;
      continue;
    }

    let outcome = 'success';
    for (const operation of group.operations) {
      try {
        await persistOperation(operation, authorization);
      } catch (error) {
        outcome = classifyCheckoutAttemptFailure(error);
        break;
      }
    }

    if (outcome === 'retryable') {
      retainedGroups += 1;
      continue;
    }
    if (removeCheckoutAttemptGroup(storage, group.attemptId)) {
      if (outcome === 'success') flushedGroups += 1;
      else droppedGroups += 1;
    } else {
      retainedGroups += 1;
    }
  }

  return {
    flushedGroups,
    droppedGroups,
    retainedGroups,
    remainingGroups: readCheckoutOutbox(storage).length,
  };
}

function toIsoString(value) {
  if (value?.toDate instanceof Function) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function decodeLegacyItems(itemsJson) {
  if (typeof itemsJson !== 'string') return [];
  try {
    return JSON.parse(itemsJson);
  } catch {
    return [];
  }
}

export async function getAllCheckoutAttempts(persistence = productionPersistence) {
  const attempts = await persistence.fetchAll();
  return attempts.map((attempt) => {
    const safeAttempt = {};
    for (const field of [
      'id', 'supportCode', 'userId', 'totalAmount', 'currentStage', 'result',
      'resolutionStatus', 'createdAt', 'updatedAt', 'expiresAt', 'resolvedAt',
      'linkedOrderId', 'linkedOrderDocumentId', 'orderId', 'adminNotes',
    ]) {
      if (field in attempt) safeAttempt[field] = attempt[field];
    }
    const customer = attempt.customer;
    return {
      ...safeAttempt,
      customer: {
        name: String(customer?.name || '').slice(0, 200),
        phone: String(customer?.phone || customer?.phoneSearch || '').slice(0, 32),
        whatsapp: String(customer?.whatsapp || attempt.delivery?.whatsapp || '').slice(0, 32),
      },
      items: sanitizeCheckoutItems(attempt.items || decodeLegacyItems(attempt.itemsJson)),
      ...('createdAt' in safeAttempt ? { createdAt: toIsoString(safeAttempt.createdAt) } : {}),
      ...('updatedAt' in safeAttempt ? { updatedAt: toIsoString(safeAttempt.updatedAt) } : {}),
      ...('expiresAt' in safeAttempt ? { expiresAt: toIsoString(safeAttempt.expiresAt) } : {}),
      ...('resolvedAt' in safeAttempt ? { resolvedAt: toIsoString(safeAttempt.resolvedAt) } : {}),
      ...(attempt.error ? { error: sanitizeCheckoutError(attempt.error) } : {}),
      ...(Array.isArray(attempt.events) ? {
        events: attempt.events.map((event) => ({
          eventId: String(event.eventId || '').slice(0, 128),
          stage: String(event.stage || '').slice(0, 64),
          outcome: String(event.outcome || '').slice(0, 32),
          occurredAt: toIsoString(event.occurredAt),
          ...(event.error ? { error: sanitizeCheckoutError(event.error) } : {}),
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
