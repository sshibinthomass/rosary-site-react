import { describe, expect, it } from 'vitest';

import { buildEntitlement, buildImportSuggestions } from '../src/rosaryBenefits.js';

const links = new Map([
  ['1', { speciesId: 'rph-1', category: 'succulent' as const }],
]);

describe('Rosary benefits', () => {
  it('creates imports only for eligible mapped items', () => {
    const orders = [
      { id: 'order-1', status: 'confirmed', items: [{ productId: '1', name: 'Aloe', quantity: 1 }, { productId: 'missing', name: 'Pot', quantity: 1 }] },
      { id: 'order-2', status: 'pending', items: [{ productId: '1', name: 'Aloe', quantity: 1 }] },
    ];
    expect(buildImportSuggestions(orders, links)).toEqual([
      expect.objectContaining({ id: 'order-1_0_0', speciesId: 'rph-1', status: 'available' }),
    ]);
  });

  it('expands quantity into stable individual imports', () => {
    const result = buildImportSuggestions([{ id: 'order-1', status: 'shipped', items: [{ productId: '1', name: 'Aloe', quantity: 2 }] }], links);
    expect(result.map((item) => item.id)).toEqual(['order-1_0_0', 'order-1_0_1']);
  });

  it('grants ninety days for delivered orders and caps future balance at 365 days', () => {
    const now = new Date('2026-07-14T08:00:00.000Z');
    const existing = { expiresAt: '2027-06-01T08:00:00.000Z', creditedOrderIds: [] as string[] };
    const order = { id: 'delivered-1', status: 'delivered', items: [] };
    expect(buildEntitlement(order, existing, now)?.expiresAt).toBe('2027-07-14T08:00:00.000Z');
  });

  it('does not credit the same delivered order twice', () => {
    const now = new Date('2026-07-14T08:00:00.000Z');
    const existing = { expiresAt: '2026-10-12T08:00:00.000Z', creditedOrderIds: ['delivered-1'] };
    const order = { id: 'delivered-1', status: 'delivered', items: [] };
    expect(buildEntitlement(order, existing, now)).toEqual(existing);
  });

  it('starts a new entitlement at the recorded delivery transition', () => {
    const now = new Date('2026-07-14T08:00:00.000Z');
    const order = {
      id: 'delivered-1',
      status: 'delivered',
      items: [],
      updatedAt: { toDate: () => new Date('2026-07-01T08:00:00.000Z') },
    };

    expect(buildEntitlement(order, undefined, now)?.expiresAt).toBe('2026-09-29T08:00:00.000Z');
  });
});
