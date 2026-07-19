import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rulesUrl = new URL('../firestore.rules', import.meta.url);

async function rulesSource() {
  return readFile(rulesUrl, 'utf8');
}

test('declares dedicated checkout attempt access rules', async () => {
  const source = await rulesSource();

  assert.match(source, /match\s+\/checkoutAttempts\/\{attemptId\}\s*\{/);
  assert.match(source, /allow\s+get,\s*list:\s*if\s+isAdmin\(\)\s*;/);
  assert.match(source, /allow\s+create:\s*if\s+request\.resource\.data\.clientWriteToken\s+is\s+string[\s\S]*?isValidCheckoutAttemptClientCreate\(\)\s*;/);
  assert.match(source, /allow\s+update:\s*if\s+isAdmin\(\)\s*\|\|\s*isValidCheckoutAttemptClientUpdate\(\)\s*;/);
  assert.match(source, /allow\s+delete:\s*if\s+false\s*;/);
});

test('requires exact create fields and a bounded future expiry', async () => {
  const source = await rulesSource();
  const start = source.indexOf('function isValidCheckoutAttemptClientCreate()');
  const end = source.indexOf('function isValidCheckoutAttemptClientUpdate()');
  const helper = source.slice(start, end);

  assert.notEqual(start, -1);
  assert.ok(end > start);
  assert.match(helper, /keys\(\)\.hasOnly\s*\(/);
  assert.match(helper, /keys\(\)\.hasAll\s*\(/);
  for (const field of [
    'supportCode', 'clientWriteToken', 'orderId', 'customer', 'delivery',
    'totalAmount', 'itemsJson', 'currentStage', 'result', 'resolutionStatus',
    'createdAt', 'updatedAt', 'expiresAt', 'events',
  ]) {
    assert.match(helper, new RegExp(`['"]${field}['"]`));
  }
  assert.match(helper, /expiresAt\s*>\s*request\.time/);
  assert.match(helper, /expiresAt\s*<=\s*request\.time\s*\+\s*duration\.value\(181,\s*['"]d['"]\)/);
});

test('requires exact bounded customer/delivery maps and a primitive encoded cart snapshot', async () => {
  const source = await rulesSource();
  const customerStart = source.indexOf('function isValidCheckoutAttemptCustomer(customer)');
  const deliveryStart = source.indexOf('function isValidCheckoutAttemptDelivery(delivery)');
  const eventStart = source.indexOf('function isValidCheckoutAttemptEvent(event)');
  const customerHelper = source.slice(customerStart, deliveryStart);
  const deliveryHelper = source.slice(deliveryStart, eventStart);

  assert.ok(customerStart >= 0);
  assert.ok(deliveryStart > customerStart);
  assert.ok(eventStart > deliveryStart);
  assert.match(customerHelper, /keys\(\)\.hasOnly\s*\(\s*\[\s*['"]name['"],\s*['"]email['"],\s*['"]phone['"],\s*['"]phoneSearch['"]\s*\]\s*\)/);
  assert.match(customerHelper, /keys\(\)\.hasAll\s*\(/);
  assert.match(deliveryHelper, /keys\(\)\.hasOnly\s*\(/);
  for (const field of ['name', 'phone', 'whatsapp', 'address', 'pincode', 'district', 'state']) {
    assert.match(deliveryHelper, new RegExp(`['"]${field}['"]`));
  }
  for (const rejected of ['credentials', 'firebaseConfig', 'apiKey', 'stack']) {
    assert.doesNotMatch(customerHelper, new RegExp(`['"]${rejected}['"]`));
    assert.doesNotMatch(deliveryHelper, new RegExp(`['"]${rejected}['"]`));
  }
  const createStart = source.indexOf('function isValidCheckoutAttemptClientCreate()');
  const updateStart = source.indexOf('function isValidCheckoutAttemptClientUpdate()');
  const createHelper = source.slice(createStart, updateStart);
  assert.match(createHelper, /data\.itemsJson\s+is\s+string/);
  assert.match(createHelper, /data\.itemsJson\.size\(\)\s*<=\s*12000/);
  assert.doesNotMatch(createHelper, /['"]items['"]/);
  assert.match(source, /data\.events\.size\(\)\s*<=\s*100/);
  assert.match(source, /data\.totalAmount\s*>=\s*0/);
  assert.match(source, /data\.totalAmount\s*<=\s*1000000000/);
});

test('limits public updates and preserves token, snapshots, expiry, and admin fields', async () => {
  const source = await rulesSource();
  const start = source.indexOf('function isValidCheckoutAttemptClientUpdate()');
  const end = source.indexOf('match /products/');
  const helper = source.slice(start, end);

  assert.notEqual(start, -1);
  assert.ok(end > start);
  assert.match(helper, /diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\s*\(/);
  for (const field of [
    'currentStage', 'result', 'updatedAt', 'events',
    'linkedOrderDocumentId', 'linkedOrderId', 'error',
  ]) {
    assert.match(helper, new RegExp(`['"]${field}['"]`));
  }
  for (const field of [
    'clientWriteToken', 'supportCode', 'orderId', 'customer', 'delivery',
    'totalAmount', 'itemsJson', 'createdAt', 'expiresAt',
    'resolutionStatus',
  ]) {
    assert.match(helper, new RegExp(`request\\.resource\\.data\\.${field}\\s*==\\s*resource\\.data\\.${field}`));
  }
  for (const field of ['adminNotes', 'resolvedAt']) {
    assert.match(helper, new RegExp(`request\\.resource\\.data\\.get\\(['"]${field}['"],`));
    assert.match(helper, new RegExp(`resource\\.data\\.get\\(['"]${field}['"],`));
  }
  assert.doesNotMatch(
    helper.match(/affectedKeys\(\)\.hasOnly\s*\((\[[\s\S]*?\])\)/)?.[1] || '',
    /resolutionStatus|adminNotes|resolvedAt|clientWriteToken/,
  );
});

test('preserves event order and validates the single appended public event', async () => {
  const source = await rulesSource();
  const eventHelperStart = source.indexOf('function isValidCheckoutAttemptEvent(event)');
  const createHelperStart = source.indexOf('function isValidCheckoutAttemptClientCreate()');
  const eventHelper = source.slice(eventHelperStart, createHelperStart);
  const updateHelperStart = source.indexOf('function isValidCheckoutAttemptClientUpdate()');
  const updateHelperEnd = source.indexOf('match /products/');
  const updateHelper = source.slice(updateHelperStart, updateHelperEnd);

  assert.ok(eventHelperStart >= 0);
  assert.ok(createHelperStart > eventHelperStart);
  assert.match(eventHelper, /event\.keys\(\)\.hasOnly\s*\(/);
  assert.match(eventHelper, /event\.keys\(\)\.hasAll\s*\(/);
  for (const field of ['eventId', 'stage', 'outcome', 'occurredAt', 'error']) {
    assert.match(eventHelper, new RegExp(`['"]${field}['"]`));
  }
  assert.match(updateHelper, /data\.events\s*==\s*resource\.data\.events/);
  assert.match(updateHelper, /resource\.data\.events\.concat\s*\(/);
  assert.match(updateHelper, /isValidCheckoutAttemptEvent\s*\(\s*data\.events\[/);
});

test('excludes orders and checkoutAttempts from the recursive admin fallback', async () => {
  const source = await rulesSource();

  assert.match(source, /match\s+\/\{collection\}\/\{document=\*\*\}\s*\{/);
  assert.match(source, /collection\s*!=\s*['"]orders['"]/);
  assert.match(source, /collection\s*!=\s*['"]checkoutAttempts['"]/);
  assert.doesNotMatch(source, /match\s+\/\{document=\*\*\}\s*\{/);

  const fallbackStart = source.indexOf('match /{collection}/{document=**}');
  const fallback = source.slice(fallbackStart);
  assert.ok(fallbackStart >= 0);
  assert.match(fallback, /isAdmin\(\)[\s\S]*collection\s*!=\s*['"]orders['"][\s\S]*collection\s*!=\s*['"]checkoutAttempts['"]/);
});
