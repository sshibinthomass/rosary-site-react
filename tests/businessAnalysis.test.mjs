import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCustomerValueAnalysis,
  buildLocationAnalysis,
  buildOrderStatusAnalysis,
  buildProductDemandAnalysis,
  buildRevenueAnalysis,
  buildStockSalesAnalysis,
  buildUserAnalysis,
} from '../src/utils/businessAnalysis.js';

const users = [
  { uid: 'u1', displayName: 'Anu', email: 'anu@example.com' },
  { uid: 'u2', displayName: 'Ben', email: 'ben@example.com' },
  { uid: 'u3', displayName: 'Cara', email: 'cara@example.com' },
  { uid: 'u4', displayName: 'Dev', email: 'dev@example.com' },
];

const orders = [
  {
    id: 'o1',
    status: 'delivered',
    createdAt: '2026-07-01T08:00:00Z',
    totalAmount: 500,
    deliveryCharge: 50,
    manualDiscount: 20,
    customer: {
      userId: 'u1',
      name: 'Anu',
      phone: '111',
      state: ' Tamil Nadu ',
      district: 'Nilgiris',
      pincode: '643101',
    },
    items: [
      { productId: 'p1', name: 'Aloe', quantity: 2, price: 100 },
      { productId: 'p2', name: 'Jade', quantity: 1, price: 300 },
    ],
  },
  {
    id: 'o2',
    status: 'confirmed',
    createdAt: '2026-07-02T08:00:00Z',
    totalAmount: 200,
    deliveryCharge: 40,
    manualDiscount: 0,
    customer: {
      userId: 'u1',
      name: 'Anu',
      phone: '111',
      state: 'Tamil Nadu',
      district: 'Nilgiris',
      pincode: '643101',
    },
    items: [{ productId: 'p1', name: 'Aloe', quantity: 1, price: 200 }],
  },
  {
    id: 'o3',
    status: 'cancelled',
    createdAt: '2026-07-03T08:00:00Z',
    totalAmount: 300,
    deliveryCharge: 0,
    manualDiscount: 0,
    customer: {
      userId: 'u2',
      name: 'Ben',
      phone: '222',
      state: 'Kerala',
      district: 'Kochi',
      pincode: '682001',
    },
    items: [{ productId: 'p3', name: 'Snake Plant', quantity: 3, price: 100 }],
  },
  {
    id: 'o4',
    status: 'delivered',
    createdAt: '2026-06-25T08:00:00Z',
    totalAmount: 250,
    deliveryCharge: 30,
    manualDiscount: 10,
    customer: {
      name: 'Guest Mina',
      phone: '999',
      state: 'Karnataka',
      district: 'Mysuru',
      pincode: '570001',
    },
    items: [{ productId: 'p4', name: 'Haworthia', quantity: 5, price: 50 }],
  },
  {
    id: 'o5',
    status: 'delivered',
    createdAt: '2026-07-04T08:00:00Z',
    totalAmount: 120,
    deliveryCharge: 0,
    manualDiscount: 0,
    customer: {
      userId: 'u4',
      name: 'Dev',
      phone: '444',
      state: 'Tamil Nadu',
      district: 'Chennai',
      pincode: '600001',
    },
    items: [{ productId: 'p2', name: 'Jade', quantity: 1, price: 120 }],
  },
];

const cartEntries = [
  {
    user: users[0],
    item: { productId: 'p5', name: 'String Plant', quantity: 2, price: 150, addedAt: '2026-07-03T08:00:00Z' },
  },
  {
    user: users[1],
    item: { productId: 'p3', name: 'Snake Plant', quantity: 2, price: 100, addedAt: '2026-07-01T08:00:00Z' },
  },
  {
    user: users[2],
    item: { productId: 'p1', name: 'Aloe', quantity: 4, price: 100 },
  },
  {
    user: users[3],
    item: { productId: 'p2', name: 'Jade', quantity: 1, price: 120, addedAt: '2026-07-03T08:00:00Z' },
  },
];

const wishlistEntries = [
  { user: users[0], item: { productId: 'p1', name: 'Aloe', price: 100 } },
  { user: users[2], item: { productId: 'p1', name: 'Aloe', price: 100 } },
  { user: users[2], item: { productId: 'p2', name: 'Jade', price: 120 } },
  { user: users[1], item: { productId: 'p5', name: 'String Plant', price: 150 } },
];

const products = [
  { id: 'p1', name: 'Aloe', category: 'Succulent', available: true, qtyAvailable: 10 },
  { id: 'p2', name: 'Jade', category: 'Indoor', available: false, qtyAvailable: 'NA' },
  { id: 'p3', name: 'Snake Plant', category: 'Indoor', available: true, qtyAvailable: 0 },
  { id: 'p4', name: 'Haworthia', category: 'Succulent', available: true, qtyAvailable: 4 },
  { id: 'p5', name: 'String Plant', category: 'Hanging', available: false, qtyAvailable: 'NA' },
];

test('buildRevenueAnalysis summarizes non-cancelled revenue and monthly rows', () => {
  const analysis = buildRevenueAnalysis(orders);

  assert.equal(analysis.summary.totalRevenue, 1160);
  assert.equal(analysis.summary.orderCount, 4);
  assert.equal(analysis.summary.averageOrderValue, 290);
  assert.equal(analysis.summary.deliveryCharges, 120);
  assert.equal(analysis.summary.discounts, 30);
  assert.deepEqual(
    analysis.rows.map((row) => [row.period, row.orderCount, row.revenue]),
    [
      ['2026-07', 3, 890],
      ['2026-06', 1, 270],
    ]
  );
});

test('buildProductDemandAnalysis combines sold, cart, and wishlist demand', () => {
  const analysis = buildProductDemandAnalysis({ orders, cartEntries, wishlistEntries });

  assert.deepEqual(
    analysis.rows.map((row) => [row.productId, row.soldQuantity, row.cartQuantity, row.wishlistSaves, row.demandScore]),
    [
      ['p1', 3, 4, 2, 19],
      ['p4', 5, 0, 0, 15],
      ['p2', 2, 1, 1, 9],
      ['p5', 0, 2, 1, 5],
      ['p3', 0, 2, 0, 4],
    ]
  );
});

test('buildUserAnalysis summarizes user order, cart, and wishlist activity', () => {
  const analysis = buildUserAnalysis({ users, orders, cartEntries, wishlistEntries });

  assert.equal(analysis.summary.totalUsers, 4);
  assert.equal(analysis.summary.orderingUsers, 2);
  assert.equal(analysis.summary.usersWithCart, 4);
  assert.equal(analysis.summary.usersWithWishlist, 3);
  assert.deepEqual(
    analysis.rows.map((row) => [row.uid, row.orderCount, row.cartItems, row.wishlistItems]),
    [
      ['u1', 2, 1, 1],
      ['u4', 1, 1, 0],
      ['u3', 0, 1, 2],
      ['u2', 0, 1, 1],
    ]
  );
});

test('buildLocationAnalysis groups non-cancelled orders by state and district', () => {
  const analysis = buildLocationAnalysis(orders);

  assert.deepEqual(
    analysis.rows.map((row) => [row.location, row.orderCount, row.revenue]),
    [
      ['Tamil Nadu / Nilgiris', 2, 770],
      ['Karnataka / Mysuru', 1, 270],
      ['Tamil Nadu / Chennai', 1, 120],
    ]
  );
  assert.equal('pincode' in analysis.rows[0], false);
});

test('buildStockSalesAnalysis highlights unavailable demand and stock pressure', () => {
  const analysis = buildStockSalesAnalysis({ products, orders, cartEntries, wishlistEntries });

  assert.deepEqual(
    analysis.rows.map((row) => [row.productId, row.available, row.stockStatus, row.soldQuantity, row.activeDemand]),
    [
      ['p5', false, 'Unavailable with demand', 0, 3],
      ['p2', false, 'Unavailable with demand', 2, 2],
      ['p3', true, 'Out of stock with cart demand', 0, 2],
      ['p4', true, 'Stock below sold quantity', 5, 0],
      ['p1', true, 'Available', 3, 6],
    ]
  );
});

test('buildOrderStatusAnalysis counts each status', () => {
  const analysis = buildOrderStatusAnalysis(orders);

  assert.deepEqual(
    analysis.rows.map((row) => [row.status, row.orderCount, row.revenue, row.percentage]),
    [
      ['delivered', 3, 920, 60],
      ['confirmed', 1, 240, 20],
      ['cancelled', 1, 300, 20],
    ]
  );
});

test('buildCustomerValueAnalysis ranks customers by non-cancelled spend', () => {
  const analysis = buildCustomerValueAnalysis({ users, orders });

  assert.equal(analysis.summary.customers, 3);
  assert.equal(analysis.summary.repeatCustomers, 1);
  assert.deepEqual(
    analysis.rows.map((row) => [row.customer, row.orderCount, row.totalValue]),
    [
      ['Anu', 2, 770],
      ['Guest Mina', 1, 270],
      ['Dev', 1, 120],
    ]
  );
});
