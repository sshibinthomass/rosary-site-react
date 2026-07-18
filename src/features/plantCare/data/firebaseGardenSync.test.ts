import { describe, expect, it } from 'vitest';

import { mergeRecords } from './firebaseGardenSync';

describe('mergeRecords', () => {
  it('keeps local and remote records with different stable IDs', () => {
    const result = mergeRecords(
      [{ id: 'local-1', updatedAt: '2026-07-14T10:00:00Z' }],
      [{ id: 'remote-1', updatedAt: '2026-07-14T11:00:00Z' }],
    );
    expect(result.map((item) => item.id)).toEqual(['local-1', 'remote-1']);
  });

  it('chooses the newer mutable record without duplicating it', () => {
    const result = mergeRecords(
      [{ id: 'same', updatedAt: '2026-07-14T12:00:00Z', name: 'Local newer' }],
      [{ id: 'same', updatedAt: '2026-07-14T11:00:00Z', name: 'Remote old' }],
    );
    expect(result).toEqual([{ id: 'same', updatedAt: '2026-07-14T12:00:00Z', name: 'Local newer' }]);
  });
});
