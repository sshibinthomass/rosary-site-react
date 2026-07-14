import { Capacitor } from '@capacitor/core';
import type { NotificationDriver } from './NotificationScheduler';

export async function createNotificationDriver(): Promise<NotificationDriver> {
  if (Capacitor.isNativePlatform()) {
    const { CapacitorNotificationDriver } = await import('./capacitorNotificationScheduler');
    return new CapacitorNotificationDriver();
  }
  const { WebNotificationDriver } = await import('./webNotificationScheduler');
  return new WebNotificationDriver();
}
