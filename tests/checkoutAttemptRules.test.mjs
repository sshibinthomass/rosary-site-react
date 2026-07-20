import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rulesUrl = new URL('../firestore.rules', import.meta.url);

async function rulesSource() {
  return readFile(rulesUrl, 'utf8');
}

test('denies every public checkout-attempt operation and allows only admin reads and constrained updates', async () => {
  const source = await rulesSource();

  assert.match(source, /match\s+\/checkoutAttempts\/\{attemptId\}\s*\{/);
  assert.match(source, /allow\s+get,\s*list:\s*if\s+isAdmin\(\)\s*;/);
  assert.match(source, /allow\s+create:\s*if\s+false\s*;/);
  assert.match(source, /allow\s+update:\s*if\s+isAdmin\(\)\s*&&\s*isValidCheckoutAttemptAdminUpdate\(\)\s*;/);
  assert.match(source, /allow\s+delete:\s*if\s+false\s*;/);
  assert.doesNotMatch(source, /isValidCheckoutAttemptClient(?:Create|Update)/);
});

test('admin updates can change only bounded investigation fields', async () => {
  const source = await rulesSource();
  const start = source.indexOf('function isValidCheckoutAttemptAdminUpdate()');
  const end = source.indexOf('match /products/');
  const helper = source.slice(start, end);

  assert.notEqual(start, -1);
  assert.ok(end > start);
  assert.match(helper, /diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\s*\(/);
  for (const field of ['resolutionStatus', 'adminNotes', 'resolvedAt', 'updatedAt']) {
    assert.match(helper, new RegExp(`['"]${field}['"]`));
  }
  assert.match(helper, /resolutionStatus\s+in\s+\[\s*['"]open['"],\s*['"]investigating['"],\s*['"]resolved['"]\s*\]/);
  assert.match(helper, /adminNotes\s+is\s+string/);
  assert.match(helper, /adminNotes\.size\(\)\s*<=\s*2000/);
  assert.match(helper, /updatedAt\s*==\s*request\.time/);
  assert.match(helper, /resolutionStatus\s*==\s*['"]resolved['"][\s\S]*resolvedAt\s*==\s*request\.time/);
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

test('keeps an executable Firestore Emulator authorization matrix', async () => {
  const source = await readFile(new URL('./firestoreRules.emulator.mjs', import.meta.url), 'utf8');

  for (const operation of ['setDoc', 'updateDoc', 'getDoc', 'getDocs', 'deleteDoc']) {
    assert.match(source, new RegExp(`assertFails\\(${operation}\\(`));
  }
  assert.match(source, /authenticatedContext\([\s\S]*email:\s*['"]sshibinthomass@gmail\.com['"]/);
  assert.match(source, /assertSucceeds\(getDoc\(/);
  assert.match(source, /assertSucceeds\(getDocs\(/);
  assert.match(source, /assertSucceeds\(updateDoc\(/);
  assert.match(source, /orders[\s\S]*assertFails\(deleteDoc\(/);
  assert.match(source, /unprotected[\s\S]*assertSucceeds\(setDoc\(/);
});
