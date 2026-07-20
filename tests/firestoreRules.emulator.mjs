import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test, { after, before } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const projectId = 'rosary-checkout-rules-test';
const attemptId = '00000000-0000-4000-8000-000000000001';
let environment;
let publicDatabase;
let adminDatabase;

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run through Firebase emulators:exec.');
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
  publicDatabase = environment.unauthenticatedContext().firestore();
  adminDatabase = environment.authenticatedContext('admin-user', {
    email: 'sshibinthomass@gmail.com',
  }).firestore();

  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await setDoc(doc(database, 'checkoutAttempts', attemptId), {
      supportCode: 'CHK-7K2M9Q',
      resolutionStatus: 'open',
      adminNotes: '',
      createdAt: new Date('2026-07-20T10:00:00.000Z'),
      updatedAt: new Date('2026-07-20T10:00:00.000Z'),
      expiresAt: new Date('2027-01-16T10:00:00.000Z'),
    });
    await setDoc(doc(database, 'orders', 'order-1'), { orderId: 'RPH-1' });
  });
});

after(async () => {
  await environment?.cleanup();
});

test('unauthenticated users cannot create, update, get, list, or delete checkout attempts', async () => {
  const attempt = doc(publicDatabase, 'checkoutAttempts', attemptId);
  await assertFails(setDoc(doc(publicDatabase, 'checkoutAttempts', 'new-attempt'), {
    supportCode: 'CHK-ABC123',
  }));
  await assertFails(updateDoc(attempt, { resolutionStatus: 'resolved' }));
  await assertFails(getDoc(attempt));
  await assertFails(getDocs(collection(publicDatabase, 'checkoutAttempts')));
  await assertFails(deleteDoc(attempt));
});

test('admins can get, list, and update only investigation fields', async () => {
  const attempt = doc(adminDatabase, 'checkoutAttempts', attemptId);
  await assertSucceeds(getDoc(attempt));
  await assertSucceeds(getDocs(collection(adminDatabase, 'checkoutAttempts')));
  await assertSucceeds(updateDoc(attempt, {
    resolutionStatus: 'investigating',
    adminNotes: 'Contacted customer.',
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(attempt, {
    currentStage: 'completed',
    updatedAt: serverTimestamp(),
  }));
});

test('resolved notes preserve resolvedAt while reopening removes it', async () => {
  const attempt = doc(adminDatabase, 'checkoutAttempts', attemptId);
  await assertSucceeds(updateDoc(attempt, {
    resolutionStatus: 'resolved',
    adminNotes: 'Resolved.',
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  const originalResolvedAt = (await getDoc(attempt)).data().resolvedAt;

  await assertSucceeds(updateDoc(attempt, {
    resolutionStatus: 'resolved',
    adminNotes: 'Resolved with additional notes.',
    updatedAt: serverTimestamp(),
  }));
  const preservedResolvedAt = (await getDoc(attempt)).data().resolvedAt;
  assert.equal(preservedResolvedAt.isEqual(originalResolvedAt), true);

  await assertSucceeds(updateDoc(attempt, {
    resolutionStatus: 'open',
    adminNotes: 'Reopened.',
    resolvedAt: deleteField(),
    updatedAt: serverTimestamp(),
  }));
  assert.equal('resolvedAt' in (await getDoc(attempt)).data(), false);
});

test('admins cannot delete checkout attempts or protected orders', async () => {
  await assertFails(deleteDoc(doc(adminDatabase, 'checkoutAttempts', attemptId)));
  await assertFails(deleteDoc(doc(adminDatabase, 'orders', 'order-1')));
});

test('the admin fallback still grants access to an unprotected collection', async () => {
  await assertSucceeds(setDoc(doc(adminDatabase, 'unprotected', 'document-1'), { ok: true }));
  await assertSucceeds(getDoc(doc(adminDatabase, 'unprotected', 'document-1')));
});
