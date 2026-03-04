import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BASE_URL = 'https://rosaryplanthouse.com'; // Change this if the domain is different

async function generateSitemap() {
  console.log('Fetching products for sitemap...');
  
  // Base URLs
  const urls = [
    `${BASE_URL}/`,
    `${BASE_URL}/about`,
    `${BASE_URL}/contact`,
    `${BASE_URL}/faq`,
    `${BASE_URL}/reviews`,
    `${BASE_URL}/cart`
  ];
  
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('available', '==', true));
    const snapshot = await getDocs(q);
    
    let productCount = 0;
    snapshot.forEach(doc => {
      urls.push(`${BASE_URL}/plant/${doc.id}`);
      productCount++;
    });

    console.log(`Found ${productCount} active products.`);
    
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>${url === `${BASE_URL}/` ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

    const publicPath = path.resolve(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(publicPath, sitemapContent);
    console.log(`Sitemap generated successfully at ${publicPath}`);
    process.exit(0);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

generateSitemap();
