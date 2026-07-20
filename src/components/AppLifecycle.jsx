import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { flushCheckoutAttemptOutbox } from '../services/checkoutAttemptService';
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

    const flushCheckoutDiagnostics = () => {
      try {
        void flushCheckoutAttemptOutbox(window.localStorage).catch((error) => {
          console.warn('Checkout diagnostic retry warning:', error);
        });
      } catch (error) {
        console.warn('Checkout diagnostic retry warning:', error);
      }
    };

    flushCheckoutDiagnostics();
    refreshCatalog('app-open');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        flushCheckoutDiagnostics();
        refreshCatalog('visible');
      }
    };

    const handleFocus = () => {
      flushCheckoutDiagnostics();
      refreshCatalog('focus');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', flushCheckoutDiagnostics);

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

      CapacitorApp.addListener('resume', () => {
        flushCheckoutDiagnostics();
        refreshCatalog('resume');
      }).then((handle) => {
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
      window.removeEventListener('online', flushCheckoutDiagnostics);
      appStateHandle?.remove();
      resumeHandle?.remove();
    };
  }, []);

  return null;
}
