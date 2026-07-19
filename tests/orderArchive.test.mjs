import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const orderServiceSource = fs.readFileSync(path.join(root, 'src', 'services', 'orderService.js'), 'utf8');
const adminSource = fs.readFileSync(path.join(root, 'src', 'pages', 'AdminOrdersPage.jsx'), 'utf8');
const rulesSource = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

test('order service archives records without deleting their public documents', () => {
  assert.match(orderServiceSource, /export async function archiveOrder\(orderId\)/);
  assert.match(orderServiceSource, /archived:\s*true/);
  assert.match(orderServiceSource, /archivedAt:\s*serverTimestamp\(\)/);
  assert.doesNotMatch(orderServiceSource, /deleteDoc/);
  assert.doesNotMatch(orderServiceSource, /export async function deleteOrder/);
});

test('admin order actions archive and hide operational records instead of deleting them', () => {
  assert.match(adminSource, /archiveOrder/);
  assert.match(adminSource, /handleBulkArchiveSelected/);
  assert.match(adminSource, /handleArchiveOrder/);
  assert.match(adminSource, /Archive Selected/);
  assert.match(adminSource, /Archive This Order/);
  assert.match(adminSource, /\.filter\(o => !o\.archived\)/);
  assert.doesNotMatch(adminSource, /deleteOrder/);
  assert.doesNotMatch(adminSource, /permanently delete/i);
});

test('Firestore rules deny order deletion for every storefront client', () => {
  const orderRules = rulesSource.match(/match \/orders\/\{orderId\} \{([\s\S]*?)\n\s{4}\}/)?.[1] || '';
  assert.match(orderRules, /allow delete:\s*if false;/);
  assert.doesNotMatch(orderRules, /allow delete:\s*if isAdmin\(\)/);
});
