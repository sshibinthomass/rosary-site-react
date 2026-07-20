import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';

function whatsappLaunchError(cause) {
  const error = new Error('External URL could not be opened.', cause ? { cause } : undefined);
  error.code = 'whatsapp-launch-failed';
  return error;
}

export function createExternalUrlOpener({ isNativePlatform, openNative, openBrowser }) {
  return async function openUrl(url) {
    if (!url) throw new Error('Cannot open an empty URL.');
    if (isNativePlatform()) {
      const result = await openNative(url);
      if (result?.completed === false) throw whatsappLaunchError();
      return true;
    }
    const openedWindow = openBrowser('', '_blank');
    if (!openedWindow) throw whatsappLaunchError();
    try {
      openedWindow.opener = null;
      openedWindow.location.href = url;
    } catch (error) {
      try {
        openedWindow.close?.();
      } catch {
        // Best-effort cleanup must not hide the stable launch failure.
      }
      throw whatsappLaunchError(error);
    }
    return true;
  };
}

const productionExternalUrlOpener = createExternalUrlOpener({
  isNativePlatform: () => Capacitor.isNativePlatform(),
  openNative: (url) => AppLauncher.openUrl({ url }),
  openBrowser: (...args) => window.open(...args),
});

export function openExternalUrl(url) {
  return productionExternalUrlOpener(url);
}
