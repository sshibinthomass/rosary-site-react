export const CHECKOUT_STAGES = Object.freeze([
  'started', 'details_validated', 'order_saved',
  'order_verified', 'whatsapp_opened', 'completed',
]);
export const CHECKOUT_RESULTS = Object.freeze(['in_progress', 'successful', 'failed']);
export const RESOLUTION_STATUSES = Object.freeze(['open', 'investigating', 'resolved']);
export const CHECKOUT_RETENTION_DAYS = 180;
export const CHECKOUT_ITEM_LIMIT = 20;
const CHECKOUT_MONEY_MAX = 1_000_000_000;
const CHECKOUT_QUANTITY_MAX = 1_000_000;

const SUPPORT_ALPHABET = 'ABCDEFG7HJKLN2PRMST9UVQWXYZ34568';
const STABLE_ERROR_CODES = new Set([
  'permission-denied',
  'unavailable',
  'network-request-failed',
  'deadline-exceeded',
  'verification-failed',
  'whatsapp-launch-failed',
  'invalid-argument',
  'validation-failed',
]);

export function normalizeContact(value = '') {
  return safeString(value, 64).replace(/\D/g, '').slice(0, 32);
}

function safeString(value, limit) {
  if (!['string', 'number', 'boolean'].includes(typeof value)) return '';
  return String(value).slice(0, limit);
}

function safeNonNegativeNumber(value, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.min(number, maximum) : 0;
}

export function createCheckoutEvent(stage, details = {}, now = () => new Date()) {
  return {
    eventId: details.eventId,
    stage,
    outcome: details.outcome || 'success',
    occurredAt: now().toISOString(),
    ...(details.error ? { error: sanitizeCheckoutError(details.error) } : {}),
  };
}

export function createCheckoutAttempt(input = {}, generators = {}) {
  const now = generators.now || (() => new Date());
  const randomUUID = generators.randomUUID || globalThis.crypto.randomUUID.bind(globalThis.crypto);
  const randomBytes = generators.randomBytes || ((length) => globalThis.crypto.getRandomValues(new Uint8Array(length)));
  const createdAt = now();
  const expiresAt = new Date(createdAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + CHECKOUT_RETENTION_DAYS);
  const customer = input.customer || {};
  const delivery = input.delivery || {};
  const supportBytes = randomBytes(6);

  return {
    id: randomUUID(),
    supportCode: `CHK-${Array.from(supportBytes).slice(0, 6).map((byte) => SUPPORT_ALPHABET[byte % SUPPORT_ALPHABET.length]).join('')}`,
    clientToken: Array.from(randomBytes(32), (byte) => byte.toString(16).padStart(2, '0')).join(''),
    orderId: safeString(input.orderId, 128),
    customer: {
      name: safeString(customer.name, 200),
      email: safeString(customer.email, 320),
      phone: normalizeContact(customer.phone),
      phoneSearch: normalizeContact(customer.phone),
    },
    delivery: {
      name: safeString(delivery.name, 200),
      phone: normalizeContact(delivery.phone),
      whatsapp: normalizeContact(delivery.whatsapp),
      address: safeString(delivery.address, 1_000),
      pincode: safeString(delivery.pincode, 20),
      district: safeString(delivery.district, 120),
      state: safeString(delivery.state, 120),
    },
    totalAmount: safeNonNegativeNumber(input.totalAmount, CHECKOUT_MONEY_MAX),
    items: (Array.isArray(input.items) ? input.items : [])
      .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
      .slice(0, CHECKOUT_ITEM_LIMIT)
      .map((item) => ({
      productId: safeString(item.productId ?? item.id, 128),
      name: safeString(item.name, 300),
      price: safeNonNegativeNumber(item.price, CHECKOUT_MONEY_MAX),
      quantity: safeNonNegativeNumber(item.quantity, CHECKOUT_QUANTITY_MAX),
      })),
    currentStage: 'started',
    result: 'in_progress',
    resolutionStatus: 'open',
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export function sanitizeCheckoutError(error) {
  const rawCode = typeof error?.code === 'string' ? error.code : '';
  const code = normalizeCheckoutErrorCode(rawCode);
  const message = typeof error?.message === 'string' ? error.message : '';
  const source = `${rawCode} ${message}`.toLowerCase();
  let category = 'unknown';

  if (source.includes('permission')) category = 'permission';
  else if (source.includes('network') || source.includes('unavailable') || source.includes('timeout')) category = 'network';
  else if (source.includes('verification') || source.includes('verify')) category = 'verification';
  else if (source.includes('whatsapp')) category = 'whatsapp';
  else if (source.includes('validation') || source.includes('invalid') || source.includes('required')) category = 'validation';

  return {
    category,
    code,
    message: safeErrorMessage(category),
  };
}

function normalizeCheckoutErrorCode(value) {
  const normalized = String(value).trim().toLowerCase().replace(/^(?:firestore|auth)\//, '');
  return STABLE_ERROR_CODES.has(normalized) ? normalized : 'unknown';
}

function safeErrorMessage(category) {
  const messages = {
    permission: 'Checkout diagnostic access was denied.',
    network: 'A network problem interrupted checkout.',
    verification: 'Checkout verification did not complete.',
    whatsapp: 'WhatsApp could not be opened.',
    validation: 'Checkout details need attention.',
    unknown: 'Checkout could not be completed.',
  };
  return messages[category];
}

export function filterCheckoutAttempts(attempts = [], filters = {}) {
  const query = String(filters.query || '').trim().toLowerCase();
  const queryPhone = /^[\d\s()+-]+$/.test(query) ? normalizeContact(query) : '';
  const from = parseFilterDate(filters.from, false);
  const to = parseFilterDate(filters.to, true);

  return attempts
    .filter((attempt) => filters.includeResolved || attempt.resolutionStatus !== 'resolved')
    .filter((attempt) => !filters.result || attempt.result === filters.result)
    .filter((attempt) => !filters.stage || attempt.currentStage === filters.stage)
    .filter((attempt) => !filters.resolutionStatus || attempt.resolutionStatus === filters.resolutionStatus)
    .filter((attempt) => {
      const createdAt = new Date(attempt.createdAt);
      return (!from || createdAt >= from) && (!to || createdAt <= to);
    })
    .filter((attempt) => {
      if (!query) return true;
      const text = [attempt.supportCode, attempt.orderId, attempt.customer?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const contacts = [
        attempt.customer?.phoneSearch || attempt.customer?.phone,
        attempt.delivery?.phone,
        attempt.delivery?.whatsappPhone,
        attempt.delivery?.whatsapp,
        attempt.whatsappPhone,
      ];
      return text.includes(query) || (queryPhone && contacts.some((contact) => normalizeContact(contact).includes(queryPhone)));
    })
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function parseFilterDate(value, endOfDay) {
  if (!value) return null;
  const source = String(value);
  const date = new Date(source.length === 10 && endOfDay ? `${source}T23:59:59.999Z` : source);
  return Number.isNaN(date.getTime()) ? null : date;
}
