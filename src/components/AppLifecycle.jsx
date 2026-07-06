import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { dispatchCatalogRefresh, getRefreshReasonsForAppState } from '../utils/catalogRefresh';
import { clearProductCacheStorage } from '../utils/productCache';

export default function AppLifecycle() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;
    let appStateHandle = null;
    let resumeHandle = null;

    const refreshCatalog = (reason) => {
      clearProductCacheStorage(window.localStorage);
      dispatchCatalogRefresh(window, reason);
    };

    refreshCatalog('app-open');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshCatalog('visible');
      }
    };

    const handleFocus = () => refreshCatalog('focus');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', (state) => {
        for (const reason of getRefreshReasonsForAppState(state)) {
          refreshCatalog(reason);
        }
      }).then((handle) => {
        if (cancelled) {
          handle.remove();
        } else {
          appStateHandle = handle;
        }
      });

      CapacitorApp.addListener('resume', () => refreshCatalog('resume')).then((handle) => {
        if (cancelled) {
          handle.remove();
        } else {
          resumeHandle = handle;
        }
      });
    }

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      appStateHandle?.remove();
      resumeHandle?.remove();
    };
  }, []);

  return null;
}
