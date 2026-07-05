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
  buildLlmsTxt,
  buildMerchantFeedTsv,
  buildRobotsTxt,
  buildSitemapXml,
  buildStaticCategoryHtml,
  buildStaticContentHubHtml,
  buildStaticGuidesIndexHtml,
  buildStaticNotFoundHtml,
  buildStaticPolicyHtml,
  buildStaticPublicPageHtml,
  buildStaticProductHtml,
  hasMerchantFeedProductRows,
  mergeFirebaseStorefrontData,
  mergeMerchantFeedStorefrontData,
  parseMerchantFeedTsv,
  PUBLIC_STATIC_PAGE_KEYS,
  stripFirebaseOwnedFieldsForSeoIndex,
} from './seo/artifacts.mjs';
import { getProductPath, isSeoIndexable } from '../src/utils/productSeo.js';
import { CATEGORIES } from '../src/config/constants.js';
import { CONTENT_HUBS, GUIDE_IMAGE_ASSETS } from '../src/utils/contentHubs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');
const productsPath = path.join(rootDir, 'src', 'data', 'products.json');
const reviewsPath = path.join(rootDir, 'src', 'data', 'reviews.json');
const BASE_URL = process.env.SITE_URL || 'https://rosaryplanthouse.com';
const sitemapSourcePaths = [
  productsPath,
  reviewsPath,
  path.join(rootDir, 'src', 'utils', 'contentHubs.js'),
  path.join(rootDir, 'src', 'utils', 'productSeo.js'),
  path.join(rootDir, 'src', 'utils', 'sitePolicy.js'),
  path.join(rootDir, 'scripts', 'seo', 'artifacts.mjs'),
];

dotenv.config({ path: path.join(rootDir, '.env.local'), quiet: true });

async function readProducts() {
  const raw = await fs.readFile(productsPath, 'utf8');
  return JSON.parse(raw);
}

async function readReviews() {
  const raw = await fs.readFile(reviewsPath, 'utf8');
  return JSON.parse(raw);
}

async function getSitemapLastmod() {
  const stats = await Promise.all(
    sitemapSourcePaths.map(async (filePath) => {
      try {
        return await fs.stat(filePath);
      } catch {
        return null;
      }
    })
  );

  const newestTime = stats.reduce((newest, stat) => (
    stat && stat.mtimeMs > newest ? stat.mtimeMs : newest
  ), 0);

  return newestTime > 0 ? new Date(newestTime).toISOString() : '';
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

async function readExistingMerchantFeedProducts() {
  const feedPath = path.join(publicDir, 'google-merchant-feed.tsv');
  try {
    const existingFeed = await fs.readFile(feedPath, 'utf8');
    return parseMerchantFeedTsv(existingFeed);
  } catch {
    return [];
  }
}

function parseServiceAccountJson(rawJson, sourceName) {
  try {
    return JSON.parse(rawJson);
  } catch (error) {
    console.warn(`Ignoring ${sourceName} because it is not valid Firebase service account JSON: ${error.message}`);
    return null;
  }
}

function readServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    const serviceAccount = parseServiceAccountJson(rawJson, 'FIREBASE_SERVICE_ACCOUNT_JSON');
    if (serviceAccount) return serviceAccount;
  }

  const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (rawBase64) {
    const decodedJson = Buffer.from(rawBase64, 'base64').toString('utf8');
    const serviceAccount = parseServiceAccountJson(decodedJson, 'FIREBASE_SERVICE_ACCOUNT_BASE64');
    if (serviceAccount) return serviceAccount;
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath && fsSync.existsSync(serviceAccountPath)) {
    const serviceAccount = parseServiceAccountJson(fsSync.readFileSync(serviceAccountPath, 'utf8'), serviceAccountPath);
    if (serviceAccount) return serviceAccount;
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

  let app;

  try {
    app = initializeAdminApp({
      credential: cert(serviceAccount),
    }, `seo-artifacts-admin-${Date.now()}`);
    const snapshot = await getAdminFirestore(app).collection('products').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.warn(`Skipping Firebase Admin storefront merge because Admin read failed: ${error.message}`);
    return null;
  } finally {
    if (app) await deleteAdminApp(app);
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

async function writePublicArtifacts({ artifactProducts, seoIndexProducts, lastmod }) {
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(path.join(publicDir, 'sitemap.xml'), buildSitemapXml(artifactProducts, { baseUrl: BASE_URL, lastmod }), 'utf8');
  await fs.writeFile(path.join(publicDir, 'robots.txt'), buildRobotsTxt({ baseUrl: BASE_URL }), 'utf8');
  await writeMerchantFeed(path.join(publicDir, 'google-merchant-feed.tsv'), artifactProducts);
  await fs.writeFile(path.join(publicDir, 'llms.txt'), buildLlmsTxt(artifactProducts, { baseUrl: BASE_URL }), 'utf8');
  await fs.writeFile(path.join(publicDir, 'product-seo-index.json'), JSON.stringify(seoIndexProducts), 'utf8');
}

async function writeStaticPublicPage({ indexHtml, page, artifactProducts, reviews }) {
  const pageHtml = buildStaticPublicPageHtml({
    indexHtml,
    page,
    baseUrl: BASE_URL,
    products: artifactProducts,
    reviews,
  });

  if (page === 'home') {
    await fs.writeFile(path.join(distDir, 'index.html'), pageHtml, 'utf8');
    return;
  }

  await fs.mkdir(path.join(distDir, page), { recursive: true });
  await fs.writeFile(path.join(distDir, page, 'index.html'), pageHtml, 'utf8');
  await fs.writeFile(path.join(distDir, `${page}.html`), pageHtml, 'utf8');
}

async function copyGuideImageAssetsToDist() {
  const imagePaths = new Set(Object.values(GUIDE_IMAGE_ASSETS));

  for (const publicPath of imagePaths) {
    const relativePath = String(publicPath || '').replace(/^\//, '');
    if (!relativePath) continue;

    const sourcePath = path.join(publicDir, relativePath);
    const destinationPath = path.join(distDir, relativePath);
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.copyFile(sourcePath, destinationPath);
  }
}

async function writeDistArtifacts({ artifactProducts, seoIndexProducts, reviews, lastmod }) {
  const indexPath = path.join(distDir, 'index.html');
  const indexHtml = await fs.readFile(indexPath, 'utf8');
  const plantRoot = path.join(distDir, 'plant');
  const categoryRoot = path.join(distDir, 'category');
  const guideRoot = path.join(distDir, 'guides');
  const policyHtml = buildStaticPolicyHtml({ indexHtml, baseUrl: BASE_URL });
  const notFoundHtml = buildStaticNotFoundHtml({ indexHtml, baseUrl: BASE_URL });

  await fs.writeFile(path.join(distDir, 'sitemap.xml'), buildSitemapXml(artifactProducts, { baseUrl: BASE_URL, lastmod }), 'utf8');
  await fs.writeFile(path.join(distDir, 'robots.txt'), buildRobotsTxt({ baseUrl: BASE_URL }), 'utf8');
  await writeMerchantFeed(path.join(distDir, 'google-merchant-feed.tsv'), artifactProducts);
  await fs.writeFile(path.join(distDir, 'llms.txt'), buildLlmsTxt(artifactProducts, { baseUrl: BASE_URL }), 'utf8');
  await fs.writeFile(path.join(distDir, 'product-seo-index.json'), JSON.stringify(seoIndexProducts), 'utf8');
  await fs.writeFile(path.join(distDir, '404.html'), notFoundHtml, 'utf8');
  for (const page of PUBLIC_STATIC_PAGE_KEYS) {
    await writeStaticPublicPage({ indexHtml, page, artifactProducts, reviews });
  }
  await fs.mkdir(path.join(distDir, 'policies'), { recursive: true });
  await fs.writeFile(path.join(distDir, 'policies', 'index.html'), policyHtml, 'utf8');
  await fs.writeFile(path.join(distDir, 'policies.html'), policyHtml, 'utf8');

  await fs.rm(plantRoot, { recursive: true, force: true });
  await fs.rm(categoryRoot, { recursive: true, force: true });
  await fs.rm(guideRoot, { recursive: true, force: true });

  const publicProducts = artifactProducts.filter(isSeoIndexable);
  const guidesIndexHtml = buildStaticGuidesIndexHtml({
    indexHtml,
    baseUrl: BASE_URL,
  });
  await fs.mkdir(guideRoot, { recursive: true });
  await copyGuideImageAssetsToDist();
  await fs.writeFile(path.join(guideRoot, 'index.html'), guidesIndexHtml, 'utf8');
  await fs.writeFile(path.join(distDir, 'guides.html'), guidesIndexHtml, 'utf8');

  for (const hub of CONTENT_HUBS) {
    const pageHtml = buildStaticContentHubHtml({
      indexHtml,
      hub,
      products: artifactProducts,
      baseUrl: BASE_URL,
    });
    const guideDir = path.join(guideRoot, hub.slug);
    await fs.mkdir(guideDir, { recursive: true });
    await fs.writeFile(path.join(guideDir, 'index.html'), pageHtml, 'utf8');
  }

  for (const category of CATEGORIES) {
    const pageHtml = buildStaticCategoryHtml({
      indexHtml,
      category,
      products: artifactProducts,
      baseUrl: BASE_URL,
    });
    const categoryDir = path.join(categoryRoot, encodeURIComponent(category));
    await fs.mkdir(categoryDir, { recursive: true });
    await fs.writeFile(path.join(categoryDir, 'index.html'), pageHtml, 'utf8');
  }

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

  console.log(`Generated ${publicProducts.length} static plant SEO pages, ${CATEGORIES.length} category pages, and ${CONTENT_HUBS.length} guide pages in ${path.relative(rootDir, distDir)}`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const localProducts = await readProducts();
  const reviews = await readReviews();
  const lastmod = await getSitemapLastmod();
  const merchantFeedProducts = await readExistingMerchantFeedProducts();
  const firebaseProducts = await readFirebaseProducts();
  const mergedStorefrontProducts = mergeFirebaseStorefrontData(localProducts, firebaseProducts);
  const artifactProducts = mergeMerchantFeedStorefrontData(mergedStorefrontProducts, merchantFeedProducts);
  const seoIndexProducts = stripFirebaseOwnedFieldsForSeoIndex(localProducts);

  if (firebaseProducts.length > 0) {
    console.log(`Merged Firebase storefront fields for ${firebaseProducts.length} products before SEO artifact generation`);
  }
  if (merchantFeedProducts.length > 0) {
    console.log(`Loaded ${merchantFeedProducts.length} existing Merchant feed rows as storefront fallback data`);
  }

  await writePublicArtifacts({ artifactProducts, seoIndexProducts, lastmod });

  if (!args.has('--public-only')) {
    try {
      await fs.access(path.join(distDir, 'index.html'));
      await writeDistArtifacts({ artifactProducts, seoIndexProducts, reviews, lastmod });
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
