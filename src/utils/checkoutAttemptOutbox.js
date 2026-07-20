export const CHECKOUT_OUTBOX_KEY = 'rosary.checkoutAttemptOutbox.v2';
export const CHECKOUT_OUTBOX_GROUP_LIMIT = 20;
export const CHECKOUT_OUTBOX_LIMIT = CHECKOUT_OUTBOX_GROUP_LIMIT;

const FORBIDDEN_PERSISTED_KEYS = new Set([
  'address', 'authorization', 'capabilityToken', 'clientToken', 'clientWriteToken',
  'district', 'email', 'firebaseIdToken', 'pincode', 'state',
]);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function containsForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!isPlainObject(value)) return false;
  return Object.entries(value).some(([key, nested]) => (
    FORBIDDEN_PERSISTED_KEYS.has(key) || containsForbiddenKey(nested)
  ));
}

function isOperationValid(operation, attemptId) {
  return isPlainObject(operation)
    && typeof operation.operationId === 'string'
    && operation.operationId.length > 0
    && operation.operationId.length <= 320
    && operation.attemptId === attemptId
    && ['create', 'update'].includes(operation.type)
    && isPlainObject(operation.payload)
    && operation.payload.attemptId === attemptId
    && !containsForbiddenKey(operation.payload);
}

function isStoredGroupValid(group, now) {
  if (
    !isPlainObject(group)
    || typeof group.attemptId !== 'string'
    || !group.attemptId
    || typeof group.expiresAt !== 'string'
    || !Array.isArray(group.operations)
    || group.operations.length === 0
  ) return false;

  const expiresAt = new Date(group.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) return false;
  if (!group.operations.every((operation) => isOperationValid(operation, group.attemptId))) return false;
  if (group.operations[0].type !== 'create') return false;
  if (group.operations.filter(({ type }) => type === 'create').length !== 1) return false;
  if (group.operations[0].payload.expiresAt !== group.expiresAt) return false;
  const operationIds = group.operations.map(({ operationId }) => operationId);
  return new Set(operationIds).size === operationIds.length;
}

function writeCheckoutOutbox(storage, groups) {
  try {
    if (groups.length === 0 && storage?.removeItem instanceof Function) {
      storage.removeItem(CHECKOUT_OUTBOX_KEY);
    } else {
      storage?.setItem(CHECKOUT_OUTBOX_KEY, JSON.stringify(groups));
    }
    return true;
  } catch {
    return false;
  }
}

export function readCheckoutOutbox(storage) {
  try {
    const stored = storage?.getItem(CHECKOUT_OUTBOX_KEY);
    if (!stored) return [];
    const groups = JSON.parse(stored);
    return Array.isArray(groups) ? groups : [];
  } catch {
    return [];
  }
}

export function pruneCheckoutOutbox(storage, options = {}) {
  const now = (options.now || (() => new Date()))();
  const groups = readCheckoutOutbox(storage);
  const kept = [];
  const removed = [];
  for (const group of groups) {
    if (isStoredGroupValid(group, now)) kept.push(group);
    else removed.push(typeof group?.attemptId === 'string' ? group.attemptId : 'malformed');
  }
  if (removed.length > 0) writeCheckoutOutbox(storage, kept);
  return { groups: kept, removed };
}

export function enqueueCheckoutAttemptGroup(storage, incomingGroup, options = {}) {
  try {
    const now = options.now || (() => new Date());
    const { groups } = pruneCheckoutOutbox(storage, { now });
    if (
      !isPlainObject(incomingGroup)
      || typeof incomingGroup.attemptId !== 'string'
      || !incomingGroup.attemptId
      || typeof incomingGroup.expiresAt !== 'string'
      || !Array.isArray(incomingGroup.operations)
      || incomingGroup.operations.length === 0
      || incomingGroup.operations.some((operation) => (
        !isOperationValid(operation, incomingGroup.attemptId)
      ))
    ) return false;

    const existingIndex = groups.findIndex(({ attemptId }) => attemptId === incomingGroup.attemptId);
    const existing = existingIndex >= 0 ? groups[existingIndex] : null;
    const operationIds = new Set((existing?.operations || []).map(({ operationId }) => operationId));
    const additions = incomingGroup.operations.filter(({ operationId }) => !operationIds.has(operationId));
    if (existing && additions.length === 0) return false;
    const candidate = {
      attemptId: incomingGroup.attemptId,
      expiresAt: existing?.expiresAt || incomingGroup.expiresAt,
      operations: [...(existing?.operations || []), ...additions],
    };
    if (!isStoredGroupValid(candidate, now())) return false;

    const nextGroups = existing
      ? groups.map((group, index) => (index === existingIndex ? candidate : group))
      : [...groups, candidate].slice(-CHECKOUT_OUTBOX_GROUP_LIMIT);
    return writeCheckoutOutbox(storage, nextGroups);
  } catch {
    return false;
  }
}

export function removeCheckoutAttemptGroup(storage, attemptId) {
  try {
    const groups = readCheckoutOutbox(storage);
    const nextGroups = groups.filter((group) => group?.attemptId !== attemptId);
    if (groups.length === nextGroups.length) return false;
    return writeCheckoutOutbox(storage, nextGroups);
  } catch {
    return false;
  }
}

export function enqueueCheckoutOperation(storage, operation, options = {}) {
  const anchor = options.anchorOperation;
  const expiresAt = options.expiresAt || anchor?.payload?.expiresAt || operation?.payload?.expiresAt;
  return enqueueCheckoutAttemptGroup(storage, {
    attemptId: operation?.attemptId,
    expiresAt,
    operations: anchor && anchor.operationId !== operation?.operationId
      ? [anchor, operation]
      : [operation],
  }, options);
}

export function removeCheckoutOperation(storage, operationId) {
  const groups = readCheckoutOutbox(storage);
  const group = groups.find(({ operations = [] }) => (
    operations.some((operation) => operation.operationId === operationId)
  ));
  return group ? removeCheckoutAttemptGroup(storage, group.attemptId) : false;
}
