import { expect, it } from 'vitest';

import { SyncRetryQueue } from './syncRetryQueue';

class MapStorage {
  value: string | null = null;
  getItem() { return this.value; }
  setItem(_key: string, value: string) { this.value = value; }
  removeItem() { this.value = null; }
}

it('persists bounded exponential retry metadata for network errors', () => {
  const queue = new SyncRetryQueue(new MapStorage());
  const first = queue.recordFailure({ code: 'unavailable' }, new Date('2026-07-14T08:00:00.000Z'));
  expect(first).toEqual(expect.objectContaining({ attemptCount: 1, lastErrorCode: 'unavailable', retryable: true }));
  expect(first.nextAttemptAt).toBe('2026-07-14T08:00:01.000Z');
});

it('stops automatic retries for permission errors', () => {
  const queue = new SyncRetryQueue(new MapStorage());
  expect(queue.recordFailure({ code: 'permission-denied' }, new Date()).retryable).toBe(false);
});
