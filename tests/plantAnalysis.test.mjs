import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPlantStats,
  filterOrdersForPlantAnalysis,
  normalizeOrderDate,
} from '../src/utils/plantAnalysis.js';

const now = new Date('2026-07-03T12:00:00Z');

const orders = [
  {
    id: 'today-delivered',
    status: 'delivered',
    createdAt: { toDate: () => new Date('2026-07-03T08:00:00Z') },
    items: [{ productId: '1', name: 'Aloe', quantity: 2, imageUrl: 'public/plants/aloe.jpg' }],
  },
  {
    id: 'this-week-confirmed',
    status: 'confirmed',
    createdAt: new Date('2026-07-01T08:00:00Z'),
    items: [{ productId: '2', name: 'Jade', quantity: 3, imageUrl: 'https://example.com/jade.jpg' }],
  },
  {
    id: 'last-month-delivered',
    status: 'delivered',
    createdAt: '2026-06-20T08:00:00Z',
    items: [{ productId: '1', name: 'Aloe', quantity: 4 }],
  },
  {
    id: 'invalid-date',
    status: 'delivered',
    createdAt: 'not-a-date',
    items: [{ productId: '3', name: 'Snake Plant', quantity: 5 }],
  },
];

const products = [
  {
    id: '1',
    name: 'Aloe',
    imageUrl: 'public/products/aloe.jpg',
    available: true,
    qtyAvailable: 'Available',
  },
  {
    id: '2',
    name: 'Jade',
    imageUrl: 'public/products/jade.jpg',
    available: false,
    qtyAvailable: 'NA',
  },
  {
    id: '3',
    name: 'Snake Plant',
    imageUrl: 'public/products/snake.jpg',
    available: true,
    qtyAvailable: 'Low',
  },
  {
    id: '4',
    commonName: 'ZZ Plant',
    title: 'Zamioculcas',
    imageUrl: 'public/products/zz.jpg',
    available: false,
    qtyAvailable: 'NA',
  },
];

test('normalizeOrderDate handles Firestore timestamps, dates, and invalid values', () => {
  const dateOnly = normalizeOrderDate('2026-07-01');

  assert.equal(
    normalizeOrderDate({ toDate: () => new Date('2026-07-03T08:00:00Z') }).toISOString(),
    '2026-07-03T08:00:00.000Z'
  );
  assert.equal(
    normalizeOrderDate('2026-07-01T08:00:00Z').toISOString(),
    '2026-07-01T08:00:00.000Z'
  );
  assert.equal(dateOnly.getFullYear(), 2026);
  assert.equal(dateOnly.getMonth(), 6);
  assert.equal(dateOnly.getDate(), 1);
  assert.equal(normalizeOrderDate('not-a-date'), null);
});

test('filterOrdersForPlantAnalysis keeps all matching statuses for overall', () => {
  const filtered = filterOrdersForPlantAnalysis(orders, ['delivered'], 'overall', now);
  assert.deepEqual(
    filtered.map((order) => order.id),
    ['today-delivered', 'last-month-delivered', 'invalid-date']
  );
});

test('filterOrdersForPlantAnalysis keeps only current-month orders for monthly', () => {
  const filtered = filterOrdersForPlantAnalysis(orders, null, 'monthly', now);
  assert.deepEqual(filtered.map((order) => order.id), ['today-delivered', 'this-week-confirmed']);
});

test('filterOrdersForPlantAnalysis keeps only current-week orders for weekly', () => {
  const filtered = filterOrdersForPlantAnalysis(orders, null, 'weekly', now);
  assert.deepEqual(filtered.map((order) => order.id), ['today-delivered', 'this-week-confirmed']);
});

test('filterOrdersForPlantAnalysis keeps only current-day orders for daily', () => {
  const filtered = filterOrdersForPlantAnalysis(orders, null, 'daily', now);
  assert.deepEqual(filtered.map((order) => order.id), ['today-delivered']);
});

test('filterOrdersForPlantAnalysis supports a custom date range', () => {
  const filtered = filterOrdersForPlantAnalysis(
    orders,
    null,
    'custom',
    now,
    {
      startDate: '2026-06-30',
      endDate: '2026-07-02',
    }
  );

  assert.deepEqual(filtered.map((order) => order.id), ['this-week-confirmed']);
});

test('filterOrdersForPlantAnalysis includes the full selected day boundaries for custom ranges', () => {
  const filtered = filterOrdersForPlantAnalysis(
    orders,
    ['delivered'],
    'custom',
    now,
    {
      startDate: '2026-07-03',
      endDate: '2026-07-03',
    }
  );

  assert.deepEqual(filtered.map((order) => order.id), ['today-delivered']);
});

test('filterOrdersForPlantAnalysis returns no matches for an inverted custom range', () => {
  const filtered = filterOrdersForPlantAnalysis(
    orders,
    null,
    'custom',
    now,
    {
      startDate: '2026-07-10',
      endDate: '2026-07-03',
    }
  );

  assert.deepEqual(filtered, []);
});

test('buildPlantStats aggregates quantity and order count from filtered orders', () => {
  const filtered = filterOrdersForPlantAnalysis(orders, null, 'monthly', now);
  const stats = buildPlantStats(filtered);

  assert.deepEqual(stats, [
    {
      productId: '2',
      name: 'Jade',
      imageUrl: 'https://example.com/jade.jpg',
      totalQuantity: 3,
      orderCount: 1,
    },
    {
      productId: '1',
      name: 'Aloe',
      imageUrl: 'public/plants/aloe.jpg',
      totalQuantity: 2,
      orderCount: 1,
    },
  ]);
});

test('buildPlantStats keeps the first available image for each plant row', () => {
  const stats = buildPlantStats([
    {
      id: 'first',
      items: [
        { productId: '1', name: 'Aloe', quantity: 1, imageUrl: '' },
        { productId: '2', name: 'Jade', quantity: 1, imageUrl: 'https://example.com/jade.jpg' },
      ],
    },
    {
      id: 'second',
      items: [
        { productId: '1', name: 'Aloe', quantity: 2, imageUrl: 'public/plants/aloe.jpg' },
      ],
    },
  ]);

  const aloe = stats.find((plant) => plant.productId === '1');
  const jade = stats.find((plant) => plant.productId === '2');

  assert.equal(aloe.imageUrl, 'public/plants/aloe.jpg');
  assert.equal(jade.imageUrl, 'https://example.com/jade.jpg');
});

test('buildPlantStats filters sold plants by catalog availability', () => {
  const filtered = filterOrdersForPlantAnalysis(orders, null, 'monthly', now);
  const availableStats = buildPlantStats(filtered, products, 'available');
  const unavailableStats = buildPlantStats(filtered, products, 'unavailable');

  assert.deepEqual(
    availableStats.map((plant) => [plant.productId, plant.available, plant.totalQuantity]),
    [['1', true, 2]]
  );
  assert.deepEqual(
    unavailableStats.map((plant) => [plant.productId, plant.available, plant.totalQuantity]),
    [['2', false, 3]]
  );
});

test('buildPlantStats lists catalog plants with no matching orders as unbought', () => {
  const filtered = filterOrdersForPlantAnalysis(orders, null, 'monthly', now);
  const stats = buildPlantStats(filtered, products, 'unbought');

  assert.deepEqual(
    stats.map((plant) => [plant.productId, plant.name, plant.available, plant.totalQuantity, plant.orderCount]),
    [
      ['3', 'Snake Plant', true, 0, 0],
      ['4', 'Zamioculcas', false, 0, 0],
    ]
  );
});

test('buildPlantStats combines purchase status and availability filters', () => {
  const filtered = filterOrdersForPlantAnalysis(orders, null, 'monthly', now);
  const availableUnbought = buildPlantStats(filtered, products, {
    purchaseFilter: 'unbought',
    availabilityFilter: 'available',
  });
  const unavailableUnbought = buildPlantStats(filtered, products, {
    purchaseFilter: 'unbought',
    availabilityFilter: 'unavailable',
  });

  assert.deepEqual(
    availableUnbought.map((plant) => [plant.productId, plant.available, plant.totalQuantity]),
    [['3', true, 0]]
  );
  assert.deepEqual(
    unavailableUnbought.map((plant) => [plant.productId, plant.available, plant.totalQuantity]),
    [['4', false, 0]]
  );
});
