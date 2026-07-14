import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import { firebaseConfig, firebaseIsConfigured } from './firebaseConfig';

export { firebaseIsConfigured } from './firebaseConfig';

let app: FirebaseApp | undefined;

export function getFirebaseApp() {
  if (!firebaseIsConfigured) throw new Error('Add the Firebase environment variables to enable account sync.');
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth { return getAuth(getFirebaseApp()); }
export function getFirebaseDb(): Firestore { return getFirestore(getFirebaseApp()); }
export function getFirebaseStorage(): FirebaseStorage { return getStorage(getFirebaseApp()); }
