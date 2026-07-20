import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  getFirebaseAdminServices,
  parseFirebaseServiceAccount,
} from '../api/firebase-admin.js';
import {
  createFirebaseCheckoutAttemptRepository,
  serializeCheckoutAttempt,
} from '../api/checkout-attempts-firebase.js';

test('loads server-only Firebase credentials from JSON or base64 without Vite variables', () => {
  const account = {
    project_id: 'rosary-test',
    client_email: 'firebase-admin@example.test',
    private_key: '-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----\n',
  };
  assert.deepEqual(parseFirebaseServiceAccount({
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(account),
  }), account);
  assert.deepEqual(parseFirebaseServiceAccount({
    FIREBASE_SERVICE_ACCOUNT_BASE64: Buffer.from(JSON.stringify(account)).toString('base64'),
  }), account);
  assert.throws(
    () => parseFirebaseServiceAccount({ VITE_FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(account) }),
    /FIREBASE_SERVICE_ACCOUNT_JSON.*FIREBASE_SERVICE_ACCOUNT_BASE64/,
  );
});

test('defers Firebase Auth loading until checkout token verification', async () => {
  const source = await readFile(new URL('../api/firebase-admin.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import\s*\{\s*getAuth\s*\}\s*from\s*['"]firebase-admin\/auth['"]/);

  let loadCalls = 0;
  const services = getFirebaseAdminServices({
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    GCLOUD_PROJECT: 'rosary-checkout-test',
  }, {
    loadAuthModule: async () => {
      loadCalls += 1;
      return {
        getAuth: () => ({
          verifyIdToken: async (token) => ({ uid: `verified:${token}` }),
        }),
      };
    },
  });

  assert.equal(loadCalls, 0);
  assert.deepEqual(await services.verifyIdToken('writer-token'), { uid: 'verified:writer-token' });
  assert.equal(loadCalls, 1);
});

test('serializes diagnostic dates for Firebase Admin without changing approved data', () => {
  const document = {
    customer: { name: 'Anu', phone: '111', whatsapp: '222' },
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:01:00.000Z',
    expiresAt: '2027-01-16T10:00:00.000Z',
    resolvedAt: '2026-07-21T08:00:00.000Z',
    events: [{
      eventId: 'event-1', stage: 'started', outcome: 'success',
      occurredAt: '2026-07-20T10:00:00.000Z',
    }],
  };
  const serialized = serializeCheckoutAttempt(document);

  assert.deepEqual(serialized.customer, document.customer);
  assert.ok(serialized.createdAt instanceof Date);
  assert.ok(serialized.updatedAt instanceof Date);
  assert.ok(serialized.expiresAt instanceof Date);
  assert.ok(serialized.resolvedAt instanceof Date);
  assert.ok(serialized.events[0].occurredAt instanceof Date);
});

test('Firebase repository applies mutation decisions inside one transaction', async () => {
  const writes = [];
  const reference = { path: 'checkoutAttempts/attempt-1' };
  const firestore = {
    collection(name) {
      assert.equal(name, 'checkoutAttempts');
      return { doc: (id) => ({ ...reference, id }) };
    },
    async runTransaction(callback) {
      return callback({
        async get(ref) {
          assert.equal(ref.id, 'attempt-1');
          return { exists: false };
        },
        set(ref, value) { writes.push({ ref, value }); },
      });
    },
  };
  const repository = createFirebaseCheckoutAttemptRepository(firestore);

  const response = await repository.transact('attempt-1', async (existing) => {
    assert.equal(existing, null);
    return {
      document: {
        createdAt: '2026-07-20T10:00:00.000Z',
        updatedAt: '2026-07-20T10:00:00.000Z',
        expiresAt: '2027-01-16T10:00:00.000Z',
        events: [],
      },
      response: { status: 201 },
    };
  });

  assert.deepEqual(response, { status: 201 });
  assert.equal(writes.length, 1);
  assert.ok(writes[0].value.createdAt instanceof Date);
});

test('Vercel endpoint delegates to the injectable core and Firebase Admin adapters', async () => {
  const endpoint = await readFile(new URL('../api/checkout-attempts.js', import.meta.url), 'utf8');
  assert.match(endpoint, /createCheckoutAttemptsHandler/);
  assert.match(endpoint, /createFirebaseCheckoutAttemptRepository/);
  assert.match(endpoint, /getFirebaseAdminServices/);
  assert.match(endpoint, /export\s+default\s+async\s+function/);
  assert.match(endpoint, /bodyParser:[\s\S]*sizeLimit:\s*['"]32kb['"]/);
  assert.doesNotMatch(endpoint, /VITE_FIREBASE/);
});
