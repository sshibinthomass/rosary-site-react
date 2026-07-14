import { describe, expect, it } from 'vitest';

import type { CareTask, UserPlant } from '../../domain/models';
import { reconcileNotifications, stableNotificationId, type NotificationDriver } from './NotificationScheduler';

const task: CareTask = {
  id: 'task-aloe-1', plantId: 'aloe', action: 'water-check', status: 'open', priority: 'normal', source: 'season-based',
  prompt: 'Check the soil and pot weight. Water only if both checks pass.', explanation: 'Season based.',
  earliestAt: '2026-07-16T08:00:00.000Z', latestAt: '2026-07-18T08:00:00.000Z',
  createdAt: '2026-07-14T08:00:00.000Z', updatedAt: '2026-07-14T08:00:00.000Z',
};
const plant: UserPlant = {
  id: 'aloe', nickname: 'Aloe vera', category: 'succulent', locationId: 'inside', provenance: { kind: 'catalogue' },
  createdAt: '2026-07-14T08:00:00.000Z', updatedAt: '2026-07-14T08:00:00.000Z',
};

describe('notification scheduling', () => {
  it('uses inspection copy and stable numeric IDs', async () => {
    const scheduled: Array<{ id: number; title: string; body: string; at: Date }> = [];
    const driver: NotificationDriver = {
      async permission() { return 'granted'; }, async requestPermission() { return 'granted'; },
      async schedule(item) { scheduled.push(item); }, async cancel() {},
    };
    await reconcileNotifications([task], [plant], driver, 9);
    expect(scheduled[0]).toEqual(expect.objectContaining({
      id: stableNotificationId(task.id), title: 'Time to check Aloe vera', body: expect.stringMatching(/check/i),
    }));
    expect(scheduled[0].body).not.toMatch(/^water\b/i);
  });

  it('does not schedule when permission is denied', async () => {
    let calls = 0;
    const driver: NotificationDriver = {
      async permission() { return 'denied'; }, async requestPermission() { return 'denied'; },
      async schedule() { calls += 1; }, async cancel() {},
    };
    await expect(reconcileNotifications([task], [plant], driver, 9)).resolves.toBe('disabled');
    expect(calls).toBe(0);
  });
});
