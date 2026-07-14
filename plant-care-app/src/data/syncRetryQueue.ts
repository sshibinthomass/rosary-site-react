interface QueueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PendingSyncOperation {
  id: 'garden-sync';
  attemptCount: number;
  lastErrorCode: string;
  nextAttemptAt?: string;
  retryable: boolean;
}

const key = 'rosary-plant-care:pending-sync';
const nonRetryableCodes = new Set(['permission-denied', 'unauthenticated', 'invalid-argument']);

function errorCode(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) return String(error.code).replace(/^firestore\//, '');
  return 'unknown';
}

export class SyncRetryQueue {
  constructor(private storage: QueueStorage) {}

  get(): PendingSyncOperation | undefined {
    try {
      const raw = this.storage.getItem(key);
      return raw ? JSON.parse(raw) as PendingSyncOperation : undefined;
    } catch { return undefined; }
  }

  recordFailure(error: unknown, now = new Date()) {
    const code = errorCode(error);
    const retryable = !nonRetryableCodes.has(code);
    const attemptCount = (this.get()?.attemptCount ?? 0) + 1;
    const delay = Math.min(300_000, 1000 * 2 ** Math.min(12, attemptCount - 1));
    const operation: PendingSyncOperation = {
      id: 'garden-sync', attemptCount, lastErrorCode: code, retryable,
      nextAttemptAt: retryable ? new Date(now.getTime() + delay).toISOString() : undefined,
    };
    this.storage.setItem(key, JSON.stringify(operation));
    return operation;
  }

  clear() { this.storage.removeItem(key); }
}
