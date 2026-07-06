import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';

export async function openExternalUrl(url) {
  if (!url) {
    throw new Error('Cannot open an empty URL.');
  }

  if (Capacitor.isNativePlatform()) {
    await AppLauncher.openUrl({ url });
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
