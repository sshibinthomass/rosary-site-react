import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';

function whatsappLaunchError(cause) {
  const error = new Error('External URL could not be opened.', cause ? { cause } : undefined);
  error.code = 'whatsapp-launch-failed';
  return error;
}

export function createExternalUrlOpener({ isNativePlatform, openNative, openBrowser }) {
  return createExternalNavigation({ isNativePlatform, openNative, openBrowser }).openExternalUrl;
}

export function createExternalNavigation({ isNativePlatform, openNative, openBrowser }) {
  function reserveExternalUrlWindow() {
    try {
      if (isNativePlatform()) return { status: 'native' };
      const handle = openBrowser('', '_blank');
      if (!handle) return { status: 'blocked', error: whatsappLaunchError() };
      return { status: 'reserved', handle, closed: false, consumed: false };
    } catch (error) {
      return { status: 'blocked', error: whatsappLaunchError(error) };
    }
  }

  function closeExternalUrlReservation(reservation) {
    if (
      reservation?.status !== 'reserved'
      || reservation.closed
      || reservation.consumed
    ) return false;
    reservation.closed = true;
    try {
      reservation.handle?.close?.();
    } catch {
      // Best-effort cleanup must not replace the checkout result.
    }
    return true;
  }

  async function openExternalUrl(url, reservation) {
    if (!url) {
      if (reservation) closeExternalUrlReservation(reservation);
      throw new Error('Cannot open an empty URL.');
    }
    const target = reservation || reserveExternalUrlWindow();
    if (target?.status === 'native') {
      const result = await openNative(url);
      if (result?.completed === false) throw whatsappLaunchError();
      return true;
    }
    if (target?.status === 'blocked') throw target.error || whatsappLaunchError();
    if (target?.status !== 'reserved' || !target.handle || target.closed || target.consumed) {
      throw whatsappLaunchError();
    }
    try {
      target.handle.opener = null;
      target.handle.location.href = url;
      target.consumed = true;
    } catch (error) {
      closeExternalUrlReservation(target);
      throw whatsappLaunchError(error);
    }
    return true;
  }

  return {
    closeExternalUrlReservation,
    openExternalUrl,
    reserveExternalUrlWindow,
  };
}

const productionExternalNavigation = createExternalNavigation({
  isNativePlatform: () => Capacitor.isNativePlatform(),
  openNative: (url) => AppLauncher.openUrl({ url }),
  openBrowser: (...args) => window.open(...args),
});

export function reserveExternalUrlWindow() {
  return productionExternalNavigation.reserveExternalUrlWindow();
}

export function closeExternalUrlReservation(reservation) {
  return productionExternalNavigation.closeExternalUrlReservation(reservation);
}

export function openExternalUrl(url, reservation) {
  return productionExternalNavigation.openExternalUrl(url, reservation);
}
