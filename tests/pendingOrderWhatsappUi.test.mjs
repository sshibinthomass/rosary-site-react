import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const orderPageSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'OrderPage.jsx'), 'utf8');
const cartPageSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'CartPage.jsx'), 'utf8');

test('pending individual order page lets customers send the saved order on WhatsApp', () => {
  assert.match(orderPageSource, /buildWhatsAppUrlForOrder/);
  assert.match(orderPageSource, /openExternalUrl\(buildWhatsAppUrlForOrder\(order, pendingOrderUrl\)\)/);
  assert.match(orderPageSource, /order\.status\?\.toLowerCase\(\) === 'pending'/);
  assert.match(orderPageSource, /This order is not placed yet/);
  assert.match(orderPageSource, />\s*Send order on WhatsApp\s*</);
  assert.match(orderPageSource, /Please tap Send there to confirm/);
});

test('cart page lists pending saved orders that still need WhatsApp confirmation', () => {
  assert.match(cartPageSource, /getOrdersByUserId/);
  assert.match(cartPageSource, /pendingOrders/);
  assert.match(cartPageSource, /setPendingOrders\(\(userOrders \|\| \[\]\)\.filter/);
  assert.match(cartPageSource, /order\.status\?\.toLowerCase\(\) === 'pending'/);
  assert.match(cartPageSource, /These order requests are saved, but not placed yet/);
  assert.match(cartPageSource, /pendingOrders\.map/);
  assert.match(cartPageSource, />\s*Send on WhatsApp\s*</);
  assert.match(cartPageSource, /openExternalUrl\(buildWhatsAppUrlForOrder\(order, orderUrl\)\)/);
});
