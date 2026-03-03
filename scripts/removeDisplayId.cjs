// Removes the "displayId" field from all documents in the "products" collection.
// Usage: node scripts/removeDisplayId.cjs

const path = require("path");
const dotenv = require("dotenv");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  deleteField,
} = require("firebase/firestore");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error("Error: Firebase config not found in .env.local");
  process.exit(1);
}

async function removeDisplayId() {
  console.log("Firebase Project:", firebaseConfig.projectId);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const snapshot = await getDocs(collection(db, "products"));
  const docsWithDisplayId = snapshot.docs.filter(
    (d) => d.data().displayId !== undefined
  );

  console.log(
    `Found ${docsWithDisplayId.length} documents with "displayId" (out of ${snapshot.size} total).`
  );

  if (docsWithDisplayId.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  const batchSize = 500;
  let removed = 0;

  for (let i = 0; i < docsWithDisplayId.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = docsWithDisplayId.slice(i, i + batchSize);
    chunk.forEach((d) => batch.update(d.ref, { displayId: deleteField() }));
    await batch.commit();
    removed += chunk.length;
    console.log(`Progress: ${removed}/${docsWithDisplayId.length} cleaned`);
  }

  console.log(`\n✅ Removed "displayId" from ${removed} documents.`);
  process.exit(0);
}

removeDisplayId().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
