export const CHECKOUT_STAGES = Object.freeze([
  'started', 'details_validated', 'order_saved',
  'order_verified', 'whatsapp_opened', 'completed',
]);
export const CHECKOUT_RESULTS = Object.freeze(['in_progress', 'successful', 'failed']);
export const RESOLUTION_STATUSES = Object.freeze(['open', 'investigating', 'resolved']);
export const CHECKOUT_RETENTION_DAYS = 180;

const SUPPORT_ALPHABET = 'ABCDEFG7HJKLN2PRMST9UVQWXYZ34568';

export function normalizeContact(value = '') {
  return String(value).replace(/\D/g, '');
}

export function createCheckoutEvent(stage, details = {}, now = () => new Date()) {
  return {
    eventId: details.eventId,
    stage,
    outcome: details.outcome || 'success',
    occurredAt: now().toISOString(),
    ...(details.error ? { error: details.error } : {}),
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
    orderId: input.orderId || '',
    customer: {
      name: customer.name || '',
      email: customer.email || '',
      phone: normalizeContact(customer.phone),
      phoneSearch: normalizeContact(customer.phone),
    },
    delivery: {
      ...delivery,
      phone: normalizeContact(delivery.phone),
    },
    totalAmount: Number(input.totalAmount || 0),
    items: (input.items || []).map((item) => ({
      productId: String(item.productId ?? item.id ?? ''),
      name: item.name || '',
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
    })),
    currentStage: 'started',
    result: 'in_progress',
    resolutionStatus: 'open',
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export function sanitizeCheckoutError(error) {
  const code = typeof error?.code === 'string' ? error.code : 'unknown';
  const message = typeof error?.message === 'string' ? error.message : '';
  const source = `${code} ${message}`.toLowerCase();
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
      return text.includes(query) || (queryPhone && normalizeContact(attempt.customer?.phoneSearch || attempt.customer?.phone).includes(queryPhone));
    })
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function parseFilterDate(value, endOfDay) {
  if (!value) return null;
  const source = String(value);
  const date = new Date(source.length === 10 && endOfDay ? `${source}T23:59:59.999Z` : source);
  return Number.isNaN(date.getTime()) ? null : date;
}
