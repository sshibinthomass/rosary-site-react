import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const adminHomeSource = fs.readFileSync('src/pages/AdminHome.jsx', 'utf8');
const expectedIconIds = Object.freeze([
  'orders',
  'checkout-tracking',
  'users',
  'products',
  'analysis',
  'limited',
  'export',
  'plant-tester',
  'settings'
]);

test('admin home cards use monochrome inline icons instead of emoji glyph strings', () => {
  const iconValues = Array.from(adminHomeSource.matchAll(/icon:\s*'([^']+)'/g), (match) => match[1]);

  assert.deepEqual(iconValues, expectedIconIds);
  assert.match(adminHomeSource, /function\s+AdminIcon\(/);
  assert.match(adminHomeSource, /<AdminIcon name=\{card\.icon\}/);
  assert.match(adminHomeSource, /fill="none"/);
  assert.match(adminHomeSource, /stroke="currentColor"/);
  assert.match(adminHomeSource, /text-\[var\(--text-primary\)\]/);
  assert.doesNotMatch(adminHomeSource, /<span>\{card\.icon\}<\/span>/);
  assert.doesNotMatch(adminHomeSource, /ðŸ|âš|ï¸/);
});

test('admin home links to checkout diagnostics with customer-support copy', () => {
  assert.match(adminHomeSource, /id:\s*'checkout-tracking'/);
  assert.match(adminHomeSource, /title:\s*'Checkout Tracking'/);
  assert.match(adminHomeSource, /path:\s*'\/admin\/checkout-attempts'/);
  assert.match(adminHomeSource, /customer checkout issues/i);
});
