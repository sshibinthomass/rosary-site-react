export const ROSARY_SITE_BASE_URL = 'https://rosaryplanthouse.com';

const GITHUB_PAGES_BASE_PATH = '/rosary-site-react';

export function isNativeAppRuntime(capacitor = null) {
  try {
    return Boolean(capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function getGoogleSignInStrategy(capacitor = null) {
  return isNativeAppRuntime(capacitor) ? 'native' : 'popup-first';
}

export function getShareableSiteBaseUrl(
  locationLike = {},
  capacitor = null,
  configuredSiteUrl = ROSARY_SITE_BASE_URL
) {
  const fallbackBaseUrl = sanitizeBaseUrl(configuredSiteUrl || ROSARY_SITE_BASE_URL);

  if (isNativeAppRuntime(capacitor)) {
    return fallbackBaseUrl;
  }

  const origin = sanitizeBaseUrl(locationLike?.origin || '');
  const pathname = locationLike?.pathname || '';

  if (pathname.startsWith(GITHUB_PAGES_BASE_PATH)) {
    return `${origin || fallbackBaseUrl}${GITHUB_PAGES_BASE_PATH}`;
  }

  if (!origin || origin.includes('localhost') || origin.startsWith('capacitor://')) {
    return fallbackBaseUrl;
  }

  return origin;
}

function sanitizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}
