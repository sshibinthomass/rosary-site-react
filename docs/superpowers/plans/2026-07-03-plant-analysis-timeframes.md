# Plant Analysis Timeframes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `Overall` / `Monthly` / `Weekly` / `Daily` timeframe switcher to the admin plant analysis page so the same summary cards and plant table can be filtered by both order status and period.

**Architecture:** Extract plant analysis filtering and aggregation into a small pure utility module that can be tested with Node's built-in test runner. Keep `AdminPlantAnalysis.jsx` responsible for loading orders, storing selected filters, and rendering the new timeframe pills plus the existing analysis table.

**Tech Stack:** React 19, Vite, Firebase Firestore order data, Node `--test`

## Global Constraints

- Keep the current status multi-select filter unchanged.
- Add a second pill-style switcher for `Overall`, `Monthly`, `Weekly`, and `Daily`.
- `Overall` includes all matching statuses.
- `Monthly`, `Weekly`, and `Daily` use `order.createdAt`.
- Firestore timestamps and plain date values must both be handled safely.
- Orders with missing or invalid `createdAt` values must be excluded from non-overall timeframes.
- The same summary cards and plant table must update from the combined status and timeframe filters.
- Reuse the existing admin page styling and avoid creating separate routes or sections.

---

### Task 1: Build Testable Plant Analysis Helpers

**Files:**
- Create: `src/utils/plantAnalysis.js`
- Create: `tests/plantAnalysis.test.mjs`

**Interfaces:**
- Consumes: raw order objects from `getAllOrders()` with `status`, `createdAt`, and `items`
- Produces: `normalizeOrderDate(createdAt)`, `isOrderInTimeframe(order, timeframe, now)`, `filterOrdersForPlantAnalysis(orders, activeStatuses, timeframe, now)`, `buildPlantStats(orders)`

- [ ] **Step 1: Write the failing test**

```javascript
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
    items: [{ productId: '1', name: 'Aloe', quantity: 2 }],
  },
  {
    id: 'this-week-confirmed',
    status: 'confirmed',
    createdAt: new Date('2026-07-01T08:00:00Z'),
    items: [{ productId: '2', name: 'Jade', quantity: 3 }],
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

test('normalizeOrderDate handles Firestore timestamps, dates, and invalid values', () => {
  assert.equal(normalizeOrderDate({ toDate: () => new Date('2026-07-03T08:00:00Z') }).toISOString(), '2026-07-03T08:00:00.000Z');
  assert.equal(normalizeOrderDate('2026-07-01T08:00:00Z').toISOString(), '2026-07-01T08:00:00.000Z');
  assert.equal(normalizeOrderDate('not-a-date'), null);
});

test('filterOrdersForPlantAnalysis keeps all matching statuses for overall', () => {
  const filtered = filterOrdersForPlantAnalysis(orders, ['delivered'], 'overall', now);
  assert.deepEqual(filtered.map((order) => order.id), ['today-delivered', 'last-month-delivered', 'invalid-date']);
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

test('buildPlantStats aggregates quantity and order count from filtered orders', () => {
  const filtered = filterOrdersForPlantAnalysis(orders, null, 'monthly', now);
  const stats = buildPlantStats(filtered);

  assert.deepEqual(stats, [
    { productId: '2', name: 'Jade', totalQuantity: 3, orderCount: 1 },
    { productId: '1', name: 'Aloe', totalQuantity: 2, orderCount: 1 },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/plantAnalysis.test.mjs`
Expected: FAIL because `../src/utils/plantAnalysis.js` does not exist yet

- [ ] **Step 3: Write minimal implementation**

```javascript
export function normalizeOrderDate(createdAt) {
  if (!createdAt) return null;
  const value = typeof createdAt.toDate === 'function' ? createdAt.toDate() : createdAt;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfWeek(date) {
  const start = getStartOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

export function isOrderInTimeframe(order, timeframe, now = new Date()) {
  if (timeframe === 'overall') return true;

  const orderDate = normalizeOrderDate(order?.createdAt);
  if (!orderDate) return false;

  const current = now instanceof Date ? now : new Date(now);

  if (timeframe === 'daily') {
    return getStartOfDay(orderDate).getTime() === getStartOfDay(current).getTime();
  }

  if (timeframe === 'weekly') {
    return getStartOfWeek(orderDate).getTime() === getStartOfWeek(current).getTime();
  }

  if (timeframe === 'monthly') {
    return orderDate.getFullYear() === current.getFullYear()
      && orderDate.getMonth() === current.getMonth();
  }

  return true;
}

export function filterOrdersForPlantAnalysis(orders, activeStatuses, timeframe, now = new Date()) {
  return (orders || []).filter((order) => {
    if (activeStatuses && !activeStatuses.includes(order.status)) {
      return false;
    }

    return isOrderInTimeframe(order, timeframe, now);
  });
}

export function buildPlantStats(orders) {
  const statsMap = new Map();

  for (const order of orders || []) {
    for (const item of order.items || []) {
      const key = item.productId || item.name || 'Unknown';
      const existing = statsMap.get(key) || {
        productId: item.productId || null,
        name: item.name || 'Unknown plant',
        totalQuantity: 0,
        orderCount: 0,
      };

      existing.totalQuantity += item.quantity || 0;
      existing.orderCount += 1;
      statsMap.set(key, existing);
    }
  }

  return Array.from(statsMap.values()).sort(
    (a, b) => b.totalQuantity - a.totalQuantity || a.name.localeCompare(b.name)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/plantAnalysis.test.mjs`
Expected: PASS with all new plant analysis tests green

- [ ] **Step 5: Commit**

```bash
git add tests/plantAnalysis.test.mjs src/utils/plantAnalysis.js
git commit -m "feat: add plant analysis timeframe helpers"
```

### Task 2: Wire Timeframe Switching Into the Admin Page

**Files:**
- Modify: `src/pages/AdminPlantAnalysis.jsx`
- Reuse: `src/utils/plantAnalysis.js`
- Verify: `tests/plantAnalysis.test.mjs`

**Interfaces:**
- Consumes: `filterOrdersForPlantAnalysis(orders, activeStatuses, timeframe, now)`, `buildPlantStats(orders)`
- Produces: plant analysis page state with `selectedTimeframe` and a combined filtered analysis view

- [ ] **Step 1: Write the failing test**

```javascript
test('filterOrdersForPlantAnalysis excludes invalid dates from non-overall periods', () => {
  const filtered = filterOrdersForPlantAnalysis(orders, ['delivered'], 'daily', now);
  assert.deepEqual(filtered.map((order) => order.id), ['today-delivered']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/plantAnalysis.test.mjs`
Expected: FAIL if the helper still includes invalid dated orders in a dated period

- [ ] **Step 3: Write minimal implementation**

```javascript
const TIMEFRAME_OPTIONS = [
  { value: 'overall', label: 'Overall' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' },
];

const [selectedTimeframe, setSelectedTimeframe] = useState('overall');

const filteredOrders = useMemo(() => {
  return filterOrdersForPlantAnalysis(orders, activeStatuses, selectedTimeframe);
}, [orders, activeStatuses, selectedTimeframe]);

const plantStats = useMemo(() => buildPlantStats(filteredOrders), [filteredOrders]);
```

Add a new timeframe card that reuses the existing pill-button classes and update the empty-state copy to:

```jsx
No plants found for the selected statuses in this period.
```
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/plantAnalysis.test.mjs`
Expected: PASS

- [ ] **Step 5: Run verification**

Run: `npm test`
Expected: PASS with the existing SEO tests plus the new plant analysis tests

Run: `npm run build`
Expected: Vite build completes successfully

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminPlantAnalysis.jsx
git commit -m "feat: add plant analysis timeframe switcher"
```
