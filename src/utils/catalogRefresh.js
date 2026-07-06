export const CATALOG_REFRESH_EVENT = 'rosary:catalog-refresh';

export function getRefreshReasonsForAppState(state) {
  return state?.isActive ? ['app-active'] : [];
}

export function createCatalogRefreshEvent(reason) {
  const detail = { reason };

  if (typeof CustomEvent === 'function') {
    return new CustomEvent(CATALOG_REFRESH_EVENT, { detail });
  }

  return {
    type: CATALOG_REFRESH_EVENT,
    detail,
  };
}

export function dispatchCatalogRefresh(target, reason) {
  if (!target?.dispatchEvent) return;
  target.dispatchEvent(createCatalogRefreshEvent(reason));
}
