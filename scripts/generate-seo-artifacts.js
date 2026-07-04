import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { initializeApp as initializeClientApp, deleteApp as deleteClientApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { initializeApp as initializeAdminApp, cert, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

import {
  buildMerchantFeedTsv,
  buildRobotsTxt,
  buildSitemapXml,
  buildStaticProductHtml,
  hasMerchantFeedProductRows,
  mergeFirebaseStorefrontData,
  stripFirebaseOwnedFieldsForSeoIndex,
} from './seo/artifacts.mjs';
import { getProductPath, isSeoIndexable } from '../src/utils/productSeo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');
const productsPath = path.join(rootDir, 'src', 'data', 'products.json');
const BASE_URL = process.env.SITE_URL || 'https://rosaryplanthouse.com';

dotenv.config({ path: path.join(rootDir, '.env.local'), quiet: true });

async function readProducts() {
  const raw = await fs.readFile(productsPath, 'utf8');
  return JSON.parse(raw);
}

async function writeMerchantFeed(filePath, products) {
  const feed = buildMerchantFeedTsv(products, { baseUrl: BASE_URL });
  if (hasMerchantFeedProductRows(feed)) {
    await fs.writeFile(filePath, feed, 'utf8');
    return;
  }

  try {
    const existingFeed = await fs.readFile(filePath, 'utf8');
    const normalizedFeed = existingFeed.replace(
      /(https?:\/\/[^\s\t/]+)\/public\/sale_plants\//g,
      '$1/sale_plants/'
    );
    if (normalizedFeed !== existingFeed) {
      await fs.writeFile(filePath, normalizedFeed, 'utf8');
    }
    console.warn(`Preserving ${path.relative(rootDir, filePath)} because no priced products were available for Merchant feed generation.`);
  } catch {
    await fs.writeFile(filePath, feed, 'utf8');
  }
}

function readServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    return JSON.parse(rawJson);
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath && fsSync.existsSync(serviceAccountPath)) {
    return JSON.parse(fsSync.readFileSync(serviceAccountPath, 'utf8'));
  }

  return null;
}

function getFirebaseConfig() {
  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };
}

async function readFirebaseProductsWithAdmin() {
  const serviceAccount = readServiceAccount();
  if (!serviceAccount) return null;

  const app = initializeAdminApp({
    credential: cert(serviceAccount),
  }, `seo-artifacts-admin-${Date.now()}`);

  try {
    const snapshot = await getAdminFirestore(app).collection('products').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } finally {
    await deleteAdminApp(app);
  }
}

async function readFirebaseProductsWithClient() {
  const firebaseConfig = getFirebaseConfig();
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey || !firebaseConfig.appId) {
    console.warn('Skipping Firebase storefront merge because VITE_FIREBASE_* env vars are missing.');
    return [];
  }

  const app = initializeClientApp(firebaseConfig, `seo-artifacts-client-${Date.now()}`);
  try {
    const snapshot = await getDocs(collection(getFirestore(app), 'products'));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.warn(`Skipping Firebase storefront merge because Firestore read failed: ${error.message}`);
    return [];
  } finally {
    await deleteClientApp(app);
  }
}

async function readFirebaseProducts() {
  const adminProducts = await readFirebaseProductsWithAdmin();
  if (adminProducts) return adminProducts;

  return readFirebaseProductsWithClient();
}

async function writePublicArtifacts({ artifactProducts, seoIndexProducts }) {
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(path.join(publicDir, 'sitemap.xml'), buildSitemapXml(artifactProducts, { baseUrl: BASE_URL }), 'utf8');
  await fs.writeFile(path.join(publicDir, 'robots.txt'), buildRobotsTxt({ baseUrl: BASE_URL }), 'utf8');
  await writeMerchantFeed(path.join(publicDir, 'google-merchant-feed.tsv'), artifactProducts);
  await fs.writeFile(path.join(publicDir, 'product-seo-index.json'), JSON.stringify(seoIndexProducts), 'utf8');
}

async function writeDistArtifacts({ artifactProducts, seoIndexProducts }) {
  const indexPath = path.join(distDir, 'index.html');
  const indexHtml = await fs.readFile(indexPath, 'utf8');
  const plantRoot = path.join(distDir, 'plant');

  await fs.writeFile(path.join(distDir, 'sitemap.xml'), buildSitemapXml(artifactProducts, { baseUrl: BASE_URL }), 'utf8');
  await fs.writeFile(path.join(distDir, 'robots.txt'), buildRobotsTxt({ baseUrl: BASE_URL }), 'utf8');
  await writeMerchantFeed(path.join(distDir, 'google-merchant-feed.tsv'), artifactProducts);
  await fs.writeFile(path.join(distDir, 'product-seo-index.json'), JSON.stringify(seoIndexProducts), 'utf8');

  await fs.rm(plantRoot, { recursive: true, force: true });

  const publicProducts = artifactProducts.filter(isSeoIndexable);
  for (const product of publicProducts) {
    const pageHtml = buildStaticProductHtml({ indexHtml, product, baseUrl: BASE_URL });
    const canonicalPath = getProductPath(product).replace(/^\//, '');
    const canonicalDir = path.join(distDir, canonicalPath);
    await fs.mkdir(canonicalDir, { recursive: true });
    await fs.writeFile(path.join(canonicalDir, 'index.html'), pageHtml, 'utf8');

    const legacyPath = `plant/${product.id}`;
    if (legacyPath !== canonicalPath) {
      const legacyDir = path.join(distDir, legacyPath);
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'index.html'), pageHtml, 'utf8');
    }
  }

  console.log(`Generated ${publicProducts.length} static plant SEO pages in ${path.relative(rootDir, plantRoot)}`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const localProducts = await readProducts();
  const firebaseProducts = await readFirebaseProducts();
  const artifactProducts = mergeFirebaseStorefrontData(localProducts, firebaseProducts);
  const seoIndexProducts = stripFirebaseOwnedFieldsForSeoIndex(localProducts);

  if (firebaseProducts.length > 0) {
    console.log(`Merged Firebase storefront fields for ${firebaseProducts.length} products before SEO artifact generation`);
  }

  await writePublicArtifacts({ artifactProducts, seoIndexProducts });

  if (!args.has('--public-only')) {
    try {
      await fs.access(path.join(distDir, 'index.html'));
      await writeDistArtifacts({ artifactProducts, seoIndexProducts });
    } catch (error) {
      if (args.has('--dist')) throw error;
      console.warn('Skipping dist SEO pages because dist/index.html is not available yet.');
    }
  }

  console.log(`Generated sitemap, robots.txt, and Merchant Center feed for ${artifactProducts.length} products`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
