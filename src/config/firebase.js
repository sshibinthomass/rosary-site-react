// Firebase Configuration
// Uses environment variables for security
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './firebaseOptions';

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);

export default app;
