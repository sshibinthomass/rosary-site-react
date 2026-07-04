import assert from 'node:assert/strict';
import test from 'node:test';

import { buildUserItemStats } from '../src/utils/userItemAnalysis.js';

const entries = [
  {
    user: { uid: 'u1', displayName: 'Anu', email: 'anu@example.com' },
    item: {
      productId: '1',
      name: 'Aloe',
      quantity: 2,
      price: 120,
      imageUrl: 'public/plants/aloe.jpg',
      category: 'Succulent',
    },
  },
  {
    user: { uid: 'u2', email: 'ben@example.com' },
    item: {
      productId: '1',
      name: 'Aloe',
      quantity: 3,
      price: 120,
      imageUrl: '',
      category: 'Succulent',
    },
  },
  {
    user: { uid: 'u1', displayName: 'Anu', email: 'anu@example.com' },
    item: {
      productId: '2',
      name: 'Jade',
      quantity: 1,
      price: 90,
      imageUrl: 'public/plants/jade.jpg',
      category: 'Indoor',
    },
  },
];

test('buildUserItemStats aggregates cart quantities and users per plant', () => {
  const stats = buildUserItemStats(entries, { quantityMode: 'quantity' });

  assert.deepEqual(stats, [
    {
      productId: '1',
      name: 'Aloe',
      imageUrl: 'public/plants/aloe.jpg',
      category: 'Succulent',
      totalQuantity: 5,
      userCount: 2,
      entryCount: 2,
      totalValue: 600,
      users: [
        { uid: 'u1', displayName: 'Anu', email: 'anu@example.com', quantity: 2 },
        { uid: 'u2', displayName: '', email: 'ben@example.com', quantity: 3 },
      ],
    },
    {
      productId: '2',
      name: 'Jade',
      imageUrl: 'public/plants/jade.jpg',
      category: 'Indoor',
      totalQuantity: 1,
      userCount: 1,
      entryCount: 1,
      totalValue: 90,
      users: [
        { uid: 'u1', displayName: 'Anu', email: 'anu@example.com', quantity: 1 },
      ],
    },
  ]);
});

test('buildUserItemStats treats wishlist entries as one saved item per user', () => {
  const stats = buildUserItemStats(entries, { quantityMode: 'entry' });

  assert.equal(stats[0].productId, '1');
  assert.equal(stats[0].totalQuantity, 2);
  assert.equal(stats[0].totalValue, 240);
  assert.deepEqual(
    stats[0].users.map((user) => ({ uid: user.uid, quantity: user.quantity })),
    [
      { uid: 'u1', quantity: 1 },
      { uid: 'u2', quantity: 1 },
    ]
  );
});

test('buildUserItemStats keeps the first available image and sorts by quantity then name', () => {
  const stats = buildUserItemStats([
    {
      user: { uid: 'u1' },
      item: { productId: '3', name: 'ZZ Plant', quantity: 1, imageUrl: '' },
    },
    {
      user: { uid: 'u2' },
      item: { productId: '3', name: 'ZZ Plant', quantity: 1, imageUrl: 'public/plants/zz.jpg' },
    },
    {
      user: { uid: 'u3' },
      item: { productId: '4', name: 'Adenium', quantity: 2, imageUrl: 'public/plants/adenium.jpg' },
    },
  ]);

  assert.deepEqual(
    stats.map((item) => [item.name, item.imageUrl]),
    [
      ['Adenium', 'public/plants/adenium.jpg'],
      ['ZZ Plant', 'public/plants/zz.jpg'],
    ]
  );
});
