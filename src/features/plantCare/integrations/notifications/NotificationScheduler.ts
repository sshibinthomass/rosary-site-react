import type { CareTask, UserPlant } from '../../domain/models';

export type ReminderPermission = 'granted' | 'denied' | 'prompt';
export interface ScheduledReminder { id: number; title: string; body: string; at: Date; taskId: string }
export interface NotificationDriver {
  permission(): Promise<ReminderPermission>;
  requestPermission(): Promise<ReminderPermission>;
  schedule(reminder: ScheduledReminder): Promise<void>;
  cancel(id: number): Promise<void>;
}

export function stableNotificationId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.max(1, Math.abs(hash));
}

function reminderTime(task: CareTask, hour: number) {
  const at = new Date(task.earliestAt);
  at.setHours(hour, 0, 0, 0);
  return at;
}

export async function reconcileNotifications(tasks: CareTask[], plants: UserPlant[], driver: NotificationDriver, preferredHour = 9) {
  if (await driver.permission() !== 'granted') return 'disabled' as const;
  for (const task of tasks.filter((item) => item.status === 'open')) {
    const plant = plants.find((item) => item.id === task.plantId);
    await driver.cancel(stableNotificationId(task.id));
    await driver.schedule({ id: stableNotificationId(task.id), taskId: task.id, title: `Time to check ${plant?.nickname ?? 'your plant'}`, body: task.prompt, at: reminderTime(task, preferredHour) });
  }
  return 'scheduled' as const;
}

export async function requestPermissionAfterFirstTask(driver: NotificationDriver) {
  const current = await driver.permission();
  return current === 'prompt' ? driver.requestPermission() : current;
}
