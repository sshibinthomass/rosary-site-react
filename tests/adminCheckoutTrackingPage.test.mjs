import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('checkout tracking page loads, filters, summarizes, and resolves attempts', () => {
  const source = read('src/pages/AdminCheckoutTrackingPage.jsx');

  assert.match(source, /import\s*\{[\s\S]*getAllCheckoutAttempts[\s\S]*updateCheckoutAttemptResolution[\s\S]*\}\s*from\s*['"]\.\.\/services\/checkoutAttemptService(?:\.js)?['"]/);
  assert.match(source, /import\s*\{[\s\S]*filterCheckoutAttempts[\s\S]*CHECKOUT_STAGES[\s\S]*RESOLUTION_STATUSES[\s\S]*\}\s*from\s*['"]\.\.\/utils\/checkoutAttemptModel(?:\.js)?['"]/);
  assert.match(source, /getAllCheckoutAttempts\(\)/);
  assert.match(source, /filterCheckoutAttempts\(attempts,/);
  assert.match(source, /new URLSearchParams\(location\.search\)\.get\(['"]orderId['"]\)/);
  assert.match(source, /attempts\.filter\([\s\S]*result\s*===\s*['"]failed['"]/);
  assert.match(source, /attempts\.filter\([\s\S]*resolutionStatus\s*===\s*['"]investigating['"]/);
  assert.match(source, /attempts\.filter\([\s\S]*resolutionStatus\s*===\s*['"]resolved['"]/);
  assert.match(source, /attempts\.filter\([\s\S]*result\s*===\s*['"]successful['"]/);
  assert.match(source, /updateCheckoutAttemptResolution\(/);
  assert.match(source, /savingAttemptId/);
  assert.match(source, /linkedOrderDocumentId[\s\S]*\/order\//);
  assert.match(source, /md:hidden/);
  assert.match(source, /hidden md:table/);

  for (const label of [
    'Checkout Tracking', 'Failures', 'Open investigations', 'Resolved', 'Successful',
    'Customer', 'Order cost', 'Support code', 'Last stage', 'Attempt time',
    'Cart snapshot', 'Timeline', 'Internal notes', 'Mark investigating', 'Mark resolved',
  ]) {
    assert.match(source, new RegExp(label));
  }
});

test('checkout tracking routes are lazy and admin protected', () => {
  const source = read('src/App.jsx');

  assert.match(source, /const AdminCheckoutTrackingPage = lazy\(\(\) => import\(['"]\.\/pages\/AdminCheckoutTrackingPage['"]\)\)/);
  for (const route of ['/admin/checkout-attempts', '/admin/checkout-attempts.html']) {
    const escaped = route.replaceAll('/', '\\/').replace('.', '\\.');
    assert.match(source, new RegExp(`path=["']${escaped}["'][\\s\\S]{0,180}<ProtectedRoute requireAdmin>[\\s\\S]{0,120}<AdminCheckoutTrackingPage \\/>`));
  }
});

test('admin orders links each record to its encoded checkout diagnostics', () => {
  const source = read('src/pages/AdminOrdersPage.jsx');

  assert.match(source, /to=\{`\/admin\/checkout-attempts\?orderId=\$\{encodeURIComponent\(order\.orderId \|\| order\.id\)\}`\}/);
  assert.match(source, />\s*Checkout issues\s*</);
});

test('resolution controls disable only while their attempt is saving', () => {
  const source = read('src/pages/AdminCheckoutTrackingPage.jsx');
  const detailStart = source.indexOf('function AttemptDetails');
  const detailEnd = source.indexOf('function AttemptBadges');
  const details = source.slice(detailStart, detailEnd);

  assert.equal(Array.from(details.matchAll(/disabled=\{saving\}/g)).length, 3);
  assert.doesNotMatch(details, /disabled=\{saving\s*\|\|/);
});
