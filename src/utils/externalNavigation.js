import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';

export function createExternalUrlOpener({ isNativePlatform, openNative, openBrowser }) {
  return async function openUrl(url) {
    if (!url) throw new Error('Cannot open an empty URL.');
    if (isNativePlatform()) {
      const result = await openNative(url);
      if (result?.completed === false) throw new Error('External URL could not be opened.');
      return true;
    }
    const openedWindow = openBrowser(url);
    if (openedWindow === null) throw new Error('External URL could not be opened.');
    return true;
  };
}

const productionExternalUrlOpener = createExternalUrlOpener({
  isNativePlatform: () => Capacitor.isNativePlatform(),
  openNative: (url) => AppLauncher.openUrl({ url }),
  openBrowser: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
});

export function openExternalUrl(url) {
  return productionExternalUrlOpener(url);
}
