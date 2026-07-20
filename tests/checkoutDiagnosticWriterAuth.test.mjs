import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CHECKOUT_DIAGNOSTIC_APP_NAME,
  createCheckoutDiagnosticWriterIdTokenProvider,
} from '../src/services/checkoutDiagnosticWriterAuth.js';

function createHarness() {
  const primaryApp = { name: '[DEFAULT]' };
  const secondaryApp = { name: CHECKOUT_DIAGNOSTIC_APP_NAME };
  const apps = [primaryApp];
  const calls = [];
  const user = {
    uid: 'anonymous-writer-1',
    async getIdToken(forceRefresh) {
      calls.push(['getIdToken', forceRefresh]);
      return `writer-token-${calls.filter(([name]) => name === 'getIdToken').length}`;
    },
  };
  const auth = {
    currentUser: null,
    async authStateReady() { calls.push(['authStateReady']); },
  };
  const dependencies = {
    firebaseConfig: { projectId: 'test-project' },
    browserLocalPersistence: { type: 'LOCAL' },
    getApps: () => apps,
    initializeApp(config, name) {
      calls.push(['initializeApp', config, name]);
      apps.push(secondaryApp);
      return secondaryApp;
    },
    getAuth(app) {
      calls.push(['getAuth', app.name]);
      assert.equal(app, secondaryApp);
      return auth;
    },
    async setPersistence(targetAuth, persistence) {
      calls.push(['setPersistence', persistence.type]);
      assert.equal(targetAuth, auth);
    },
    async signInAnonymously(targetAuth) {
      calls.push(['signInAnonymously']);
      assert.equal(targetAuth, auth);
      auth.currentUser = user;
      return { user };
    },
  };
  return { apps, auth, calls, dependencies, primaryApp, secondaryApp, user };
}

test('uses a named secondary app with local anonymous auth without touching the primary app', async () => {
  const harness = createHarness();
  const getWriterIdToken = createCheckoutDiagnosticWriterIdTokenProvider(harness.dependencies);

  assert.equal(await getWriterIdToken(), 'writer-token-1');
  assert.equal(await getWriterIdToken(), 'writer-token-2');

  assert.equal(harness.apps[0], harness.primaryApp);
  assert.deepEqual(harness.calls.filter(([name]) => name === 'initializeApp'), [[
    'initializeApp',
    { projectId: 'test-project' },
    CHECKOUT_DIAGNOSTIC_APP_NAME,
  ]]);
  assert.equal(harness.calls.filter(([name]) => name === 'setPersistence').length, 1);
  assert.equal(harness.calls.filter(([name]) => name === 'authStateReady').length, 1);
  assert.equal(harness.calls.filter(([name]) => name === 'signInAnonymously').length, 1);
  assert.deepEqual(harness.calls.filter(([name]) => name === 'getIdToken'), [
    ['getIdToken', true],
    ['getIdToken', true],
  ]);
});

test('a cold provider reuses the restored secondary anonymous user and refreshes its token', async () => {
  const harness = createHarness();
  harness.apps.push(harness.secondaryApp);
  harness.auth.currentUser = harness.user;
  const getWriterIdToken = createCheckoutDiagnosticWriterIdTokenProvider(harness.dependencies);

  assert.equal(await getWriterIdToken(), 'writer-token-1');

  assert.equal(harness.calls.some(([name]) => name === 'initializeApp'), false);
  assert.equal(harness.calls.some(([name]) => name === 'signInAnonymously'), false);
  assert.deepEqual(harness.calls.filter(([name]) => name === 'getIdToken'), [
    ['getIdToken', true],
  ]);
});

test('primary Firebase modules select the default app even if the diagnostic app initialized first', async () => {
  for (const relativePath of [
    '../src/config/firebase.js',
    '../src/config/firebaseAuth.js',
  ]) {
    const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
    assert.match(source, /getApps\(\)\.find\(\(\{ name \}\) => name === ['"]\[DEFAULT\]['"]\)/);
    assert.doesNotMatch(source, /getApps\(\)\[0\]/);
  }
});
