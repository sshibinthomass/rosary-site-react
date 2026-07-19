const RELEASE_STORAGE_KEY = 'rosary-service-worker-release';

export async function digestServiceWorkerSource(source) {
  const bytes = new TextEncoder().encode(source);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function checkForServiceWorkerRelease({
  serviceWorker,
  storage,
  fetcher = globalThis.fetch,
  digestSource = digestServiceWorkerSource,
  now = Date.now,
}) {
  const response = await fetcher(`/sw.js?check=${now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Service worker check failed with status ${response.status}`);
  }

  const fingerprint = await digestSource(await response.text());
  const storedFingerprint = storage.getItem(RELEASE_STORAGE_KEY);

  if (storedFingerprint === fingerprint && serviceWorker.controller) {
    return { updated: false };
  }

  const releaseUrl = `/sw.js?release=${encodeURIComponent(fingerprint)}`;
  const registration = await serviceWorker.register(releaseUrl);
  storage.setItem(RELEASE_STORAGE_KEY, fingerprint);

  return { updated: true, registration };
}
