import type { NotificationDriver, ReminderPermission, ScheduledReminder } from './NotificationScheduler';

const timers = new Map<number, number>();

export class WebNotificationDriver implements NotificationDriver {
  async permission(): Promise<ReminderPermission> { if (!('Notification' in window)) return 'denied'; return Notification.permission === 'default' ? 'prompt' : Notification.permission; }
  async requestPermission(): Promise<ReminderPermission> { if (!('Notification' in window)) return 'denied'; const result = await Notification.requestPermission(); return result === 'default' ? 'prompt' : result; }
  async schedule(reminder: ScheduledReminder) {
    const delay = Math.max(0, Math.min(2_147_483_647, reminder.at.getTime() - Date.now()));
    timers.set(reminder.id, window.setTimeout(() => { new Notification(reminder.title, { body: reminder.body, tag: `plant-task-${reminder.taskId}` }); timers.delete(reminder.id); }, delay));
  }
  async cancel(id: number) { const timer = timers.get(id); if (timer !== undefined) window.clearTimeout(timer); timers.delete(id); }
}
