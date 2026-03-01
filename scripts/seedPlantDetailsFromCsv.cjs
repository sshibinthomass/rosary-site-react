// Seed plant details into Firestore directly from "Rosary All Site Details.xlsx"
// Usage:
//   1) Install Excel parser once (in project root):
//        npm install xlsx
//   2) Make sure .env.local has your Firebase config (VITE_FIREBASE_*)
//   3) Run:
//        node scripts/seedPlantDetailsFromCsv.cjs
//
// By default this writes to the "plantDetails" collection.
// If your collection name is different, change COLLECTION_NAME below.

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const XLSX = require("xlsx");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  doc,
  writeBatch,
  getDocs,
} = require("firebase/firestore");

// ---- Config ----------------------------------------------------------------

// Load environment variables from .env.local (same as other scripts)
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
  console.error(
    "Error: Firebase config not found. Make sure .env.local exists with VITE_FIREBASE_* variables.",
  );
  process.exit(1);
}

// Collection to UPDATE with Excel data
// For your case we now write directly into "products"
const COLLECTION_NAME = "products";

// Path to the Excel file
const EXCEL_PATH = path.join(__dirname, "..", "Rosary All Site Details.xlsx");

// ---- Helpers ----------------------------------------------------------------

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "y";
}

// ---- Main seeding logic -----------------------------------------------------

async function seedPlantDetails() {
  console.log("Firebase Project:", firebaseConfig.projectId);
  console.log(`Target collection: ${COLLECTION_NAME}`);
  console.log(`Reading Excel from: ${EXCEL_PATH}`);

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`Error: Excel file not found at ${EXCEL_PATH}`);
    process.exit(1);
  }

  // Read and parse Excel (first sheet, header row as keys)
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  console.log(`Parsed ${records.length} rows from Excel sheet "${sheetName}".`);

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const collRef = collection(db, COLLECTION_NAME);

  // For products we DO NOT delete documents.
  // We only update/merge matching IDs with data from Excel.
  console.log(
    `\nUpdating documents in "${COLLECTION_NAME}" from Excel (merge by id)...`,
  );

  const batchSize = 500;
  let totalAdded = 0;

  try {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = records.slice(i, i + batchSize);

      chunk.forEach((row) => {
        // Actual Excel headers (from "Rosary All Site Details.xlsx"):
        // Id, Common Name, Available, Sales Price, title, url, Size, Transit,
        // Watering, Sunlight, Orginal Price, category, mother, Hanging, Combo,
        // Indoor, Is Restocked, Place Ava, Qty Ava, Demand, Description

        const id = String(row["Id"] ?? row["id"] ?? "").trim();
        if (!id) {
          return;
        }

        const docRef = doc(collRef, id);

        const data = {
          id,
          commonName: row["Common Name"] || "",
          title: row["title"] || "",
          imageUrl: row["url"] || "",
          salesPrice: Number(row["Sales Price"]) || 0,
          originalPrice: Number(row["Orginal Price"]) || 0,
          available: toBoolean(row["Available"]),
          qtyAvailable: row["Qty Ava"] || "Available",
          isRestocked: toBoolean(row["Is Restocked"]),
          category: row["category"] || "",
          size: row["Size"] || "",
          transit: row["Transit"] || "",
          watering: row["watering"] || "",
          sunlight: row["sunlight"] || "",
          placeAvailable: row["Place Ava"] || "",
          demand: row["Demand"] || "",
          mother: toBoolean(row["mother"]),
          hanging: toBoolean(row["Hanging"]),
          combo: toBoolean(row["Combo"]),
          indoor: toBoolean(row["Indoor"]),
          description: row["Description"] || "",
          name: row["Common Name"] || "",
          price: Number(row["Sales Price"]) || 0,
          inStock: toBoolean(row["Available"]) && (row["Qty Ava"] || "Available") !== "0",
          updatedAt: new Date(),
        };

        batch.set(docRef, data, { merge: true });
      });

      await batch.commit();
      totalAdded += chunk.length;
      console.log(
        `Progress: ${Math.min(totalAdded, records.length)}/${records.length} rows processed`,
      );
    }

    console.log(
      `\n✅ Successfully seeded ${records.length} plant detail documents into "${COLLECTION_NAME}".`,
    );
  } catch (error) {
    console.error("Error seeding plant details:", error);
    process.exit(1);
  }

  process.exit(0);
}

seedPlantDetails();
