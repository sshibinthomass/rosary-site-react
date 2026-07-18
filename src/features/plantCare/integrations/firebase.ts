import app, { db } from '../../../config/firebase';
import { firebaseConfig } from '../../../config/firebaseOptions';
import { storage } from '../../../config/firebaseStorage';

export const firebaseIsConfigured = Object.values(firebaseConfig).every((value) => Boolean(value));

export function getFirebaseApp() { return app; }
export function getFirebaseDb() { return db; }
export function getFirebaseStorage() { return storage; }
