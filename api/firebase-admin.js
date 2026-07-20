import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function decodeServiceAccount(source, encoding) {
  try {
    const decoded = encoding === 'base64'
      ? Buffer.from(source, 'base64').toString('utf8')
      : source;
    const account = JSON.parse(decoded);
    if (
      !account
      || typeof account !== 'object'
      || typeof account.project_id !== 'string'
      || typeof account.client_email !== 'string'
      || typeof account.private_key !== 'string'
    ) {
      throw new TypeError('Missing service-account fields.');
    }
    return {
      ...account,
      private_key: account.private_key.replaceAll('\\n', '\n'),
    };
  } catch {
    throw new Error('Firebase service-account credentials are invalid.');
  }
}

export function parseFirebaseServiceAccount(environment = process.env) {
  if (environment.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return decodeServiceAccount(environment.FIREBASE_SERVICE_ACCOUNT_JSON, 'utf8');
  }
  if (environment.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    return decodeServiceAccount(environment.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
  }
  throw new Error(
    'Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64 for the checkout API.',
  );
}

function initializeFirebaseAdmin(environment) {
  const existing = getApps()[0];
  if (existing) return existing;

  if (environment.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({
      projectId: environment.GCLOUD_PROJECT
        || environment.FIREBASE_PROJECT_ID
        || 'rosary-checkout-emulator',
    });
  }

  return initializeApp({ credential: cert(parseFirebaseServiceAccount(environment)) });
}

export function getFirebaseAdminServices(environment = process.env) {
  const app = initializeFirebaseAdmin(environment);
  return {
    firestore: getFirestore(app),
    verifyIdToken: (token) => getAuth(app).verifyIdToken(token),
  };
}
