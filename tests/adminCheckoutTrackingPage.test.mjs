import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as checkoutAttemptModel from '../src/utils/checkoutAttemptModel.js';

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
  assert.match(source, /savingAttemptIds/);
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

test('active-save helpers preserve concurrent attempt IDs immutably', () => {
  const addActiveCheckoutAttemptId = checkoutAttemptModel.addActiveCheckoutAttemptId;
  const removeActiveCheckoutAttemptId = checkoutAttemptModel.removeActiveCheckoutAttemptId;
  assert.equal(typeof addActiveCheckoutAttemptId, 'function');
  assert.equal(typeof removeActiveCheckoutAttemptId, 'function');

  const empty = new Set();
  const first = addActiveCheckoutAttemptId(empty, 'attempt-a');
  const both = addActiveCheckoutAttemptId(first, 'attempt-b');
  const secondOnly = removeActiveCheckoutAttemptId(both, 'attempt-a');

  assert.deepEqual([...empty], []);
  assert.deepEqual([...first], ['attempt-a']);
  assert.deepEqual([...both], ['attempt-a', 'attempt-b']);
  assert.deepEqual([...secondOnly], ['attempt-b']);
});

test('contact helper keeps phone and WhatsApp distinct and never substitutes email', () => {
  const getCheckoutAttemptContacts = checkoutAttemptModel.getCheckoutAttemptContacts;
  assert.equal(typeof getCheckoutAttemptContacts, 'function');
  assert.deepEqual(getCheckoutAttemptContacts({
    customer: { phone: '111', email: 'private@example.com' },
    delivery: { phone: '222', whatsapp: '333' },
  }), { phone: '111', whatsapp: '333' });
  assert.deepEqual(getCheckoutAttemptContacts({
    customer: { email: 'email-only@example.com' },
    delivery: {},
  }), { phone: '', whatsapp: '' });
});

test('responsive DOM helpers produce unique matching panel and notes IDs', () => {
  const getCheckoutAttemptDomIds = checkoutAttemptModel.getCheckoutAttemptDomIds;
  assert.equal(typeof getCheckoutAttemptDomIds, 'function');
  const desktop = getCheckoutAttemptDomIds('attempt/one', 'desktop');
  const mobile = getCheckoutAttemptDomIds('attempt/one', 'mobile');

  assert.notEqual(desktop.panelId, mobile.panelId);
  assert.notEqual(desktop.notesId, mobile.notesId);
  assert.match(desktop.panelId, /^checkout-attempt-desktop-/);
  assert.match(mobile.notesId, /^checkout-attempt-mobile-/);
});

test('timeline outcome helper never invents success for missing or unknown values', () => {
  const formatCheckoutEventOutcome = checkoutAttemptModel.formatCheckoutEventOutcome;
  assert.equal(typeof formatCheckoutEventOutcome, 'function');
  assert.equal(formatCheckoutEventOutcome('success'), 'Success');
  assert.equal(formatCheckoutEventOutcome('failed'), 'Failed');
  assert.equal(formatCheckoutEventOutcome(), 'Outcome not recorded');
  assert.equal(formatCheckoutEventOutcome('mystery'), 'Outcome not recorded');
});

test('page keeps diagnostic contacts, responsive IDs, truthful timeline copy, and accessible expansion wiring', () => {
  const source = read('src/pages/AdminCheckoutTrackingPage.jsx');

  assert.match(source, /getCheckoutAttemptContacts\(attempt\)/);
  assert.match(source, />Phone:</);
  assert.match(source, />WhatsApp:</);
  assert.doesNotMatch(source, /customer\?\.email/);
  assert.match(source, /idPrefix="desktop"/);
  assert.match(source, /idPrefix="mobile"/);
  assert.match(source, /aria-controls=\{domIds\.panelId\}/);
  assert.match(source, /aria-label=\{getExpandLabel\(attempt, expanded\)\}/);
  assert.match(source, /checkout details for \$\{customerName\}, support code \$\{supportCode\}/);
  assert.match(source, /formatCheckoutEventOutcome\(event\.outcome\)/);
  assert.match(source, /does not prove the customer sent the message, paid, or that the order was confirmed or accepted/);
});

test('page retains failed-save notes, tracks concurrent saves, and separates load errors from empty results', () => {
  const source = read('src/pages/AdminCheckoutTrackingPage.jsx');
  const saveStart = source.indexOf('const saveResolution');
  const saveEnd = source.indexOf('const toggleAttempt');
  const saveSource = source.slice(saveStart, saveEnd);
  const catchStart = saveSource.indexOf('catch');
  const failedSaveSource = saveSource.slice(catchStart);

  assert.match(source, /useState\(\(\) => new Set\(\)\)/);
  assert.match(source, /addActiveCheckoutAttemptId/);
  assert.match(source, /removeActiveCheckoutAttemptId/);
  assert.doesNotMatch(failedSaveSource, /setNotes/);
  assert.match(source, /includeResolved:\s*false/);
  assert.match(source, /setLoadError\(/);
  assert.match(source, /loadError\s*\?/);
  assert.match(source, />\s*Retry loading attempts\s*</);
  assert.match(source, /setLoadRequest\(\(request\) => request \+ 1\)/);
});

test('mobile cards keep semantic summary content outside the disclosure button', () => {
  const source = read('src/pages/AdminCheckoutTrackingPage.jsx');
  const mobileStart = source.indexOf('<div className="space-y-3 md:hidden">');
  const mobileEnd = source.indexOf('\nfunction FragmentRow');
  const mobileSource = source.slice(mobileStart, mobileEnd);
  const buttonStart = mobileSource.indexOf('<button');
  const buttonEnd = mobileSource.indexOf('</button>', buttonStart);
  const disclosureButton = mobileSource.slice(buttonStart, buttonEnd);

  assert.ok(mobileStart >= 0 && mobileEnd > mobileStart, 'mobile card source should be isolated');
  assert.doesNotMatch(disclosureButton, /<h2|<div|<dl|AttemptContacts|AttemptBadges/);
  assert.match(
    mobileSource,
    /<article[\s\S]*?<div className="p-4">[\s\S]*?<h2[\s\S]*?<AttemptContacts[\s\S]*?<dl[\s\S]*?<AttemptBadges[\s\S]*?<\/div>[\s\S]*?<button/,
  );
  assert.match(disclosureButton, /aria-expanded=\{expanded\}/);
  assert.match(disclosureButton, /aria-controls=\{getCheckoutAttemptDomIds\(attempt\.id, 'mobile'\)\.panelId\}/);
  assert.match(disclosureButton, /aria-label=\{getExpandLabel\(attempt, expanded\)\}/);
  assert.match(disclosureButton, /\{expanded \? 'Hide details' : 'Show details'\}/);
  assert.match(
    mobileSource,
    /id=\{getCheckoutAttemptDomIds\(attempt\.id, 'mobile'\)\.panelId\}/,
  );
});
