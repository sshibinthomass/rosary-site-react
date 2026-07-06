export const PRODUCT_CACHE_PREFIX = 'rosary_products_';
export const PRODUCT_CACHE_TTL_MS = 15 * 60 * 1000;

export function readProductCache(storage, cacheKey, now = Date.now(), ttlMs = PRODUCT_CACHE_TTL_MS) {
  if (!storage) return null;

  const fullKey = `${PRODUCT_CACHE_PREFIX}${cacheKey}`;

  try {
    const raw = storage.getItem(fullKey);
    if (!raw) return null;

    const { timestamp, data } = JSON.parse(raw);
    if (Array.isArray(data) && now - timestamp < ttlMs) {
      return data;
    }

    storage.removeItem(fullKey);
  } catch (error) {
    try {
      storage.removeItem(fullKey);
    } catch {
      // Ignore secondary storage cleanup failures.
    }
    console.warn('Failed to read product cache:', error);
  }

  return null;
}

export function writeProductCache(storage, cacheKey, data, now = Date.now()) {
  if (!storage) return;

  try {
    storage.setItem(
      `${PRODUCT_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify({ timestamp: now, data })
    );
  } catch (error) {
    console.warn('Failed to write product cache:', error);
  }
}

export function clearProductCacheStorage(storage) {
  if (!storage) return;

  for (let i = storage.length - 1; i >= 0; i -= 1) {
    const key = storage.key(i);
    if (key && key.startsWith(PRODUCT_CACHE_PREFIX)) {
      storage.removeItem(key);
    }
  }
}
