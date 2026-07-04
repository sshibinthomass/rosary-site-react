import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildStateOrderStats,
  calculateOrderIncome,
  normalizeStateName,
} from '../src/utils/orderAnalysis.js';

const orders = [
  {
    id: 'tamil-1',
    totalAmount: 1000,
    deliveryCharge: 80,
    manualDiscount: 30,
    customer: { state: ' tamil nadu ' },
  },
  {
    id: 'kerala-1',
    totalAmount: 600,
    deliveryCharge: 50,
    manualDiscount: 0,
    customer: { state: 'KERALA' },
  },
  {
    id: 'tamil-2',
    totalAmount: 400,
    deliveryCharge: 0,
    manualDiscount: 20,
    customer: { state: 'Tamil Nadu' },
  },
  {
    id: 'unknown-1',
    totalAmount: 250,
    deliveryCharge: 40,
    manualDiscount: 0,
    customer: { state: '' },
  },
];

test('normalizeStateName trims and standardizes state names', () => {
  assert.equal(normalizeStateName(' tamil nadu '), 'Tamil Nadu');
  assert.equal(normalizeStateName('KERALA'), 'Kerala');
  assert.equal(normalizeStateName(''), 'Unknown');
  assert.equal(normalizeStateName(null), 'Unknown');
});

test('calculateOrderIncome defaults to final paid amount', () => {
  assert.equal(
    calculateOrderIncome({
      totalAmount: 1000,
      deliveryCharge: 80,
      manualDiscount: 30,
    }),
    1050
  );
});

test('calculateOrderIncome can switch to total amount only', () => {
  assert.equal(
    calculateOrderIncome({
      totalAmount: 1000,
      deliveryCharge: 80,
      manualDiscount: 30,
    }, 'total-only'),
    1000
  );
});

test('buildStateOrderStats groups orders by state and uses final paid amount by default', () => {
  const stats = buildStateOrderStats(orders);

  assert.deepEqual(stats, [
    {
      state: 'Tamil Nadu',
      orderCount: 2,
      grossIncome: 1430,
    },
    {
      state: 'Kerala',
      orderCount: 1,
      grossIncome: 650,
    },
    {
      state: 'Unknown',
      orderCount: 1,
      grossIncome: 290,
    },
  ]);
});

test('buildStateOrderStats can use total amount only mode', () => {
  const stats = buildStateOrderStats(orders, 'total-only');

  assert.deepEqual(stats, [
    {
      state: 'Tamil Nadu',
      orderCount: 2,
      grossIncome: 1400,
    },
    {
      state: 'Kerala',
      orderCount: 1,
      grossIncome: 600,
    },
    {
      state: 'Unknown',
      orderCount: 1,
      grossIncome: 250,
    },
  ]);
});
