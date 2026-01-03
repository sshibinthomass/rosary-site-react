// Firebase Seeding Script
// Run with: node scripts/seedFirebase.cjs
// Make sure you have a .env.local file with your Firebase config

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch } = require('firebase/firestore');
const products = require('./products.json');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

console.log('Firebase Project:', firebaseConfig.projectId);

if (!firebaseConfig.projectId) {
  console.error('Error: Firebase config not found. Make sure .env.local exists with VITE_FIREBASE_* variables');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedProducts() {
  console.log(`\nSeeding ${products.length} products to Firestore...`);
  
  const batchSize = 500; // Firestore limit
  let totalAdded = 0;

  try {
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = products.slice(i, i + batchSize);

      chunk.forEach((product) => {
        const docRef = doc(collection(db, 'products'), product.id);
        const { id, ...data } = product;
        batch.set(docRef, {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      await batch.commit();
      totalAdded += chunk.length;
      console.log(`Progress: ${totalAdded}/${products.length} products added`);
    }

    console.log(`\n✅ Successfully seeded ${totalAdded} products to Firestore!`);
    console.log('\nProduct breakdown:');
    console.log(`- Available: ${products.filter(p => p.available).length}`);
    console.log(`- Unavailable: ${products.filter(p => !p.available).length}`);
    
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedProducts();
