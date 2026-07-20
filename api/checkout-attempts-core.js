export const CHECKOUT_PRIMARY_USER_TOKEN_HEADER = 'x-checkout-user-token';
export const CHECKOUT_RETENTION_MS = 180 * 24 * 60 * 60 * 1_000;
export const CHECKOUT_API_BODY_MAX_BYTES = 32_768;

const CHECKOUT_STAGES = Object.freeze([
  'started',
  'details_validated',
  'order_saved',
  'order_verified',
  'whatsapp_opened',
  'completed',
]);
const CHECKOUT_RESULTS = new Set(['in_progress', 'successful', 'failed']);
const ERROR_CATEGORIES = new Set([
  'permission', 'network', 'verification', 'whatsapp', 'validation', 'unknown',
]);
const ERROR_CODES = new Set([
  'permission-denied', 'unavailable', 'network-request-failed',
  'deadline-exceeded', 'verification-failed', 'whatsapp-launch-failed',
  'invalid-argument', 'validation-failed', 'unknown',
]);
const ATTEMPT_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const SUPPORT_CODE_PATTERN = /^CHK-[A-Z0-9]{6}$/;
const PHONE_PATTERN = /^\d{0,32}$/;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1_000;
const MAX_EVENTS = 100;
const MAX_ITEMS = 20;
const MAX_MONEY = 1_000_000_000;
const MAX_QUANTITY = 1_000_000;

class CheckoutAttemptHttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'CheckoutAttemptHttpError';
    this.status = status;
    this.code = code;
  }
}

function fail(status, code, message) {
  throw new CheckoutAttemptHttpError(status, code, message);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, required, optional = [], label = 'request') {
  if (!isPlainObject(value)) fail(400, 'invalid-request', `${label} must be an object.`);
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  if (required.some((key) => !keys.includes(key)) || keys.some((key) => !allowed.has(key))) {
    fail(400, 'invalid-request', `${label} contains invalid fields.`);
  }
}

function boundedString(value, label, maximum, { allowEmpty = true, pattern } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0) || value.length > maximum) {
    fail(400, 'invalid-request', `${label} is invalid.`);
  }
  if (pattern && !pattern.test(value)) fail(400, 'invalid-request', `${label} is invalid.`);
  return value;
}

function boundedNumber(value, label, maximum, { integer = false, minimum = 0 } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    fail(400, 'invalid-request', `${label} is invalid.`);
  }
  if (integer && !Number.isInteger(value)) fail(400, 'invalid-request', `${label} is invalid.`);
  return value;
}

function isoTimestamp(value, label) {
  if (typeof value !== 'string') fail(400, 'invalid-request', `${label} is invalid.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    fail(400, 'invalid-request', `${label} is invalid.`);
  }
  return value;
}

function storedTimestamp(value, label) {
  if (typeof value === 'string') return isoTimestamp(value, label);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (value?.toDate instanceof Function) return value.toDate().toISOString();
  fail(500, 'invalid-stored-attempt', `Stored ${label} is invalid.`);
}

function validateCustomer(customer) {
  assertExactKeys(customer, ['name', 'phone', 'whatsapp'], [], 'customer');
  return {
    name: boundedString(customer.name, 'customer.name', 200),
    phone: boundedString(customer.phone, 'customer.phone', 32, { pattern: PHONE_PATTERN }),
    whatsapp: boundedString(customer.whatsapp, 'customer.whatsapp', 32, { pattern: PHONE_PATTERN }),
  };
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length > MAX_ITEMS) {
    fail(400, 'invalid-request', 'items is invalid.');
  }
  return items.map((item, index) => {
    assertExactKeys(item, ['productId', 'name', 'price', 'quantity'], [], `items[${index}]`);
    return {
      productId: boundedString(item.productId, `items[${index}].productId`, 128),
      name: boundedString(item.name, `items[${index}].name`, 300),
      price: boundedNumber(item.price, `items[${index}].price`, MAX_MONEY),
      quantity: boundedNumber(item.quantity, `items[${index}].quantity`, MAX_QUANTITY, { integer: true }),
    };
  });
}

function validateError(error, label = 'error') {
  assertExactKeys(error, ['category', 'code', 'message'], [], label);
  if (!ERROR_CATEGORIES.has(error.category) || !ERROR_CODES.has(error.code)) {
    fail(400, 'invalid-request', `${label} is invalid.`);
  }
  return {
    category: error.category,
    code: error.code,
    message: boundedString(error.message, `${label}.message`, 200),
  };
}

function validateEvent(input, label = 'event') {
  assertExactKeys(input, ['eventId', 'stage', 'outcome', 'occurredAt'], ['error'], label);
  const result = {
    eventId: boundedString(input.eventId, `${label}.eventId`, 128, { allowEmpty: false }),
    stage: boundedString(input.stage, `${label}.stage`, 32, { allowEmpty: false }),
    outcome: boundedString(input.outcome, `${label}.outcome`, 16, { allowEmpty: false }),
    occurredAt: isoTimestamp(input.occurredAt, `${label}.occurredAt`),
  };
  if (!CHECKOUT_STAGES.includes(result.stage) || !['success', 'failed'].includes(result.outcome)) {
    fail(400, 'invalid-request', `${label} is invalid.`);
  }
  if ('error' in input) result.error = validateError(input.error, `${label}.error`);
  return result;
}

function validateAttemptId(value) {
  return boundedString(value, 'attemptId', 128, {
    allowEmpty: false,
    pattern: ATTEMPT_ID_PATTERN,
  });
}

function validateOperationId(value) {
  return boundedString(value, 'operationId', 320, { allowEmpty: false });
}

function validateCreateBody(body, now) {
  assertExactKeys(body, [
    'attemptId', 'operationId', 'supportCode', 'customer', 'items', 'totalAmount',
    'currentStage', 'result', 'createdAt', 'updatedAt', 'expiresAt', 'event',
  ], ['userId']);
  const createdAt = isoTimestamp(body.createdAt, 'createdAt');
  const updatedAt = isoTimestamp(body.updatedAt, 'updatedAt');
  const expiresAt = isoTimestamp(body.expiresAt, 'expiresAt');
  const createdMs = Date.parse(createdAt);
  const expiresMs = Date.parse(expiresAt);
  const nowMs = now.getTime();
  if (
    updatedAt !== createdAt
    || expiresMs - createdMs !== CHECKOUT_RETENTION_MS
    || expiresMs <= nowMs
    || createdMs > nowMs + MAX_FUTURE_CLOCK_SKEW_MS
  ) {
    fail(400, 'invalid-expiry', 'Checkout attempt expiry is invalid.');
  }
  if (body.currentStage !== 'started' || body.result !== 'in_progress') {
    fail(400, 'invalid-lifecycle-transition', 'Checkout attempt must start in progress.');
  }
  const initialEvent = validateEvent(body.event);
  if (
    initialEvent.stage !== 'started'
    || initialEvent.outcome !== 'success'
    || initialEvent.occurredAt !== createdAt
    || initialEvent.error
  ) {
    fail(400, 'event-mismatch', 'Initial event does not match the attempt.');
  }
  const result = {
    attemptId: validateAttemptId(body.attemptId),
    operationId: validateOperationId(body.operationId),
    supportCode: boundedString(body.supportCode, 'supportCode', 10, {
      allowEmpty: false,
      pattern: SUPPORT_CODE_PATTERN,
    }),
    customer: validateCustomer(body.customer),
    items: validateItems(body.items),
    totalAmount: boundedNumber(body.totalAmount, 'totalAmount', MAX_MONEY),
    currentStage: body.currentStage,
    result: body.result,
    createdAt,
    updatedAt,
    expiresAt,
    event: initialEvent,
  };
  if ('userId' in body) {
    result.userId = boundedString(body.userId, 'userId', 128, { allowEmpty: false });
  }
  return result;
}

function validatePatchBody(body) {
  assertExactKeys(body, [
    'attemptId', 'operationId', 'currentStage', 'result', 'updatedAt', 'event',
  ], ['linkedOrderDocumentId', 'linkedOrderId', 'error']);
  const result = {
    attemptId: validateAttemptId(body.attemptId),
    operationId: validateOperationId(body.operationId),
    currentStage: boundedString(body.currentStage, 'currentStage', 32, { allowEmpty: false }),
    result: boundedString(body.result, 'result', 16, { allowEmpty: false }),
    updatedAt: isoTimestamp(body.updatedAt, 'updatedAt'),
    event: validateEvent(body.event),
  };
  if (!CHECKOUT_STAGES.includes(result.currentStage) || !CHECKOUT_RESULTS.has(result.result)) {
    fail(400, 'invalid-lifecycle-transition', 'Checkout attempt lifecycle is invalid.');
  }
  if ('linkedOrderDocumentId' in body) {
    result.linkedOrderDocumentId = boundedString(
      body.linkedOrderDocumentId,
      'linkedOrderDocumentId',
      128,
      { allowEmpty: false },
    );
  }
  if ('linkedOrderId' in body) {
    result.linkedOrderId = boundedString(body.linkedOrderId, 'linkedOrderId', 128, { allowEmpty: false });
  }
  if ('error' in body) {
    result.error = body.error === null ? null : validateError(body.error);
  }
  return result;
}

function headerValue(headers, name) {
  if (headers?.get instanceof Function) return headers.get(name) || '';
  const target = name.toLowerCase();
  const key = Object.keys(headers || {}).find((candidate) => candidate.toLowerCase() === target);
  const value = key ? headers[key] : '';
  return Array.isArray(value) ? value[0] : String(value || '');
}

function parseJsonBody(request) {
  const contentLength = Number(headerValue(request.headers, 'content-length'));
  if (Number.isFinite(contentLength) && contentLength > CHECKOUT_API_BODY_MAX_BYTES) {
    fail(413, 'payload-too-large', 'Checkout attempt payload is too large.');
  }
  let body = request.body;
  let encoded;
  try {
    if (Buffer.isBuffer(body)) body = body.toString('utf8');
    if (typeof body === 'string') {
      encoded = body;
      body = JSON.parse(body);
    } else {
      encoded = JSON.stringify(body);
    }
  } catch {
    fail(400, 'invalid-json', 'Request body must be valid JSON.');
  }
  if (Buffer.byteLength(encoded || '', 'utf8') > CHECKOUT_API_BODY_MAX_BYTES) {
    fail(413, 'payload-too-large', 'Checkout attempt payload is too large.');
  }
  if (!isPlainObject(body)) fail(400, 'invalid-request', 'Request body must be an object.');
  return body;
}

async function decodeIdToken(token, verifyIdToken, code, message) {
  if (!(verifyIdToken instanceof Function)) {
    fail(500, 'identity-verifier-unavailable', 'Identity verification is unavailable.');
  }
  try {
    return await verifyIdToken(token);
  } catch {
    fail(401, code, message);
  }
}

function errorResponse(error) {
  const known = error instanceof CheckoutAttemptHttpError;
  const status = known ? error.status : 500;
  return {
    status,
    body: {
      error: {
        code: known ? error.code : 'internal-error',
        message: known ? error.message : 'Checkout diagnostics are temporarily unavailable.',
        retryable: classifyCheckoutAttemptResponse(status) === 'retryable',
      },
    },
  };
}

function success(status, body) {
  return { status, body };
}

async function verifyWriter(request, verifyIdToken) {
  const authorization = headerValue(request.headers, 'authorization');
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization.trim());
  if (!match || match[1].length > 8_192) {
    fail(401, 'writer-token-required', 'An anonymous checkout writer token is required.');
  }
  const decoded = await decodeIdToken(
    match[1],
    verifyIdToken,
    'invalid-writer-token',
    'Anonymous checkout writer token is invalid.',
  );
  if (typeof decoded?.uid !== 'string' || !decoded.uid || decoded.uid.length > 128) {
    fail(401, 'invalid-writer-token', 'Anonymous checkout writer token is invalid.');
  }
  if (decoded.firebase?.sign_in_provider !== 'anonymous') {
    fail(403, 'anonymous-writer-required', 'Checkout diagnostics require an anonymous writer identity.');
  }
  return decoded.uid;
}

async function verifyOptionalUser(body, request, verifyIdToken) {
  if (!body.userId) return;
  const token = headerValue(request.headers, CHECKOUT_PRIMARY_USER_TOKEN_HEADER).trim();
  if (!token || token.length > 8_192) {
    fail(401, 'primary-id-token-required', 'A primary Firebase ID token is required for userId.');
  }
  const decoded = await decodeIdToken(
    token,
    verifyIdToken,
    'invalid-primary-id-token',
    'Primary Firebase ID token is invalid.',
  );
  if (decoded.firebase?.sign_in_provider === 'anonymous') {
    fail(403, 'primary-user-required', 'A signed-in primary user is required for userId.');
  }
  if (decoded?.uid !== body.userId) fail(403, 'user-id-mismatch', 'Firebase user ID does not match.');
}

function validatePatchTransition(existing, patch, now) {
  const existingStageIndex = CHECKOUT_STAGES.indexOf(existing.currentStage);
  const nextStageIndex = CHECKOUT_STAGES.indexOf(patch.currentStage);
  if (existingStageIndex < 0) fail(500, 'invalid-stored-attempt', 'Stored checkout lifecycle is invalid.');
  if (patch.event.stage !== patch.currentStage) {
    fail(400, 'event-mismatch', 'Event stage does not match the lifecycle update.');
  }
  if (patch.event.occurredAt !== patch.updatedAt) {
    fail(400, 'event-mismatch', 'Event timestamp does not match the lifecycle update.');
  }
  if (existing.result === 'successful') {
    fail(409, 'invalid-lifecycle-transition', 'A completed checkout attempt cannot advance.');
  }

  const isFailure = patch.result === 'failed';
  if (isFailure) {
    if (
      nextStageIndex !== existingStageIndex
      || patch.event.outcome !== 'failed'
      || !patch.error
      || !patch.event.error
      || JSON.stringify(patch.error) !== JSON.stringify(patch.event.error)
    ) {
      fail(400, 'event-mismatch', 'Failure event does not match the lifecycle update.');
    }
  } else {
    const expectedResult = patch.currentStage === 'completed' ? 'successful' : 'in_progress';
    if (
      nextStageIndex !== existingStageIndex + 1
      || patch.result !== expectedResult
      || patch.event.outcome !== 'success'
      || patch.event.error
      || (patch.error !== undefined && patch.error !== null)
    ) {
      fail(409, 'invalid-lifecycle-transition', 'Checkout attempt may only move to the next stage.');
    }
  }

  const previousUpdatedAt = Date.parse(storedTimestamp(existing.updatedAt, 'updatedAt'));
  const expiresAt = Date.parse(storedTimestamp(existing.expiresAt, 'expiresAt'));
  const updatedAt = Date.parse(patch.updatedAt);
  const eventAt = Date.parse(patch.event.occurredAt);
  if (
    now.getTime() >= expiresAt
    || updatedAt < previousUpdatedAt
    || updatedAt > now.getTime() + MAX_FUTURE_CLOCK_SKEW_MS
    || updatedAt > expiresAt
    || eventAt < previousUpdatedAt
    || eventAt > updatedAt
  ) {
    fail(409, 'invalid-lifecycle-transition', 'Checkout attempt timestamps cannot move backward or past expiry.');
  }

  for (const field of ['linkedOrderDocumentId', 'linkedOrderId']) {
    if (existing[field] && patch[field] && existing[field] !== patch[field]) {
      fail(409, 'immutable-order-link', 'Linked order identifiers cannot change.');
    }
  }
  const introducesOrderLink = ['linkedOrderDocumentId', 'linkedOrderId']
    .some((field) => !existing[field] && patch[field]);
  if (introducesOrderLink && patch.currentStage !== 'order_saved') {
    fail(400, 'invalid-order-link', 'Linked order identifiers must be set at the saved-order stage.');
  }
  const linkedOrderDocumentId = patch.linkedOrderDocumentId || existing.linkedOrderDocumentId;
  const linkedOrderId = patch.linkedOrderId || existing.linkedOrderId;
  if (patch.currentStage === 'order_saved' && (!linkedOrderDocumentId || !linkedOrderId)) {
    fail(400, 'invalid-order-link', 'Saved-order events require both order identifiers.');
  }
}

export function classifyCheckoutAttemptResponse(status) {
  if (Number.isInteger(status) && status >= 200 && status < 300) return 'success';
  if (status === 429 || (Number.isInteger(status) && status >= 500)) return 'retryable';
  return 'permanent';
}

export function createCheckoutAttemptsHandler({ repository, verifyIdToken, now = () => new Date() }) {
  if (!(repository?.transact instanceof Function)) {
    throw new TypeError('A checkout-attempt transaction repository is required.');
  }

  return async function handleCheckoutAttempt(request) {
    try {
      const method = String(request?.method || '').toUpperCase();
      if (!['POST', 'PATCH'].includes(method)) {
        return {
          ...errorResponse(new CheckoutAttemptHttpError(
            405,
            'method-not-allowed',
            'Only POST and PATCH are supported.',
          )),
          headers: { allow: 'POST, PATCH' },
        };
      }
      const contentType = headerValue(request.headers, 'content-type').toLowerCase();
      if (!/^application\/json(?:\s*;|$)/.test(contentType)) {
        fail(415, 'unsupported-media-type', 'Content-Type must be application/json.');
      }
      const body = parseJsonBody(request);
      const currentTime = now();
      if (!(currentTime instanceof Date) || Number.isNaN(currentTime.getTime())) {
        throw new TypeError('now() must return a valid Date.');
      }
      const writerUid = await verifyWriter(request, verifyIdToken);

      if (method === 'POST') {
        const input = validateCreateBody(body, currentTime);
        await verifyOptionalUser(input, request, verifyIdToken);
        return await repository.transact(input.attemptId, async (existing) => {
          if (existing) {
            if (existing.writerUid !== writerUid) {
              fail(409, 'attempt-conflict', 'Checkout attempt already exists.');
            }
            return {
              response: success(200, {
                attemptId: input.attemptId,
                supportCode: existing.supportCode,
                idempotent: true,
              }),
            };
          }
          const document = {
            supportCode: input.supportCode,
            ...(input.userId ? { userId: input.userId } : {}),
            customer: input.customer,
            items: input.items,
            totalAmount: input.totalAmount,
            currentStage: input.currentStage,
            result: input.result,
            resolutionStatus: 'open',
            createdAt: input.createdAt,
            updatedAt: input.updatedAt,
            expiresAt: input.expiresAt,
            events: [input.event],
            writerUid,
          };
          return {
            document,
            response: success(201, {
              attemptId: input.attemptId,
              supportCode: input.supportCode,
              idempotent: false,
            }),
          };
        });
      }

      const input = validatePatchBody(body);
      return await repository.transact(input.attemptId, async (existing) => {
        if (!existing) fail(404, 'attempt-not-found', 'Checkout attempt was not found.');
        if (existing.writerUid !== writerUid) {
          fail(403, 'writer-mismatch', 'Checkout attempt writer does not match.');
        }
        const events = Array.isArray(existing.events) ? existing.events : [];
        if (events.some(({ eventId }) => eventId === input.event.eventId)) {
          return {
            response: success(200, {
              attemptId: input.attemptId,
              currentStage: existing.currentStage,
              result: existing.result,
              idempotent: true,
            }),
          };
        }
        if (events.length >= MAX_EVENTS) fail(409, 'event-limit-reached', 'Checkout event limit was reached.');
        validatePatchTransition(existing, input, currentTime);
        const document = {
          ...existing,
          currentStage: input.currentStage,
          result: input.result,
          updatedAt: input.updatedAt,
          events: [...events, input.event],
          ...(input.linkedOrderDocumentId ? {
            linkedOrderDocumentId: input.linkedOrderDocumentId,
          } : {}),
          ...(input.linkedOrderId ? { linkedOrderId: input.linkedOrderId } : {}),
        };
        if (input.result === 'failed') document.error = input.error;
        else delete document.error;
        return {
          document,
          response: success(200, {
            attemptId: input.attemptId,
            currentStage: input.currentStage,
            result: input.result,
            idempotent: false,
          }),
        };
      });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
