import { LocalNotifications } from '@capacitor/local-notifications';
import type { NotificationDriver, ReminderPermission, ScheduledReminder } from './NotificationScheduler';

function normalizePermission(display: string): ReminderPermission { if (display === 'granted') return 'granted'; if (display === 'denied') return 'denied'; return 'prompt'; }

export class CapacitorNotificationDriver implements NotificationDriver {
  async permission() { return normalizePermission((await LocalNotifications.checkPermissions()).display); }
  async requestPermission() { return normalizePermission((await LocalNotifications.requestPermissions()).display); }
  async schedule(reminder: ScheduledReminder) { await LocalNotifications.schedule({ notifications: [{ id: reminder.id, title: reminder.title, body: reminder.body, schedule: { at: reminder.at }, extra: { taskId: reminder.taskId } }] }); }
  async cancel(id: number) { await LocalNotifications.cancel({ notifications: [{ id }] }); }
}
