import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  buildMerchantFeedTsv,
  buildRobotsTxt,
  buildSitemapXml,
  buildStaticProductHtml,
} from './seo/artifacts.mjs';
import { getProductPath } from '../src/utils/productSeo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');
const productsPath = path.join(rootDir, 'src', 'data', 'products.json');
const BASE_URL = process.env.SITE_URL || 'https://rosaryplanthouse.com';

async function readProducts() {
  const raw = await fs.readFile(productsPath, 'utf8');
  return JSON.parse(raw);
}

async function writePublicArtifacts(products) {
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(path.join(publicDir, 'sitemap.xml'), buildSitemapXml(products, { baseUrl: BASE_URL }), 'utf8');
  await fs.writeFile(path.join(publicDir, 'robots.txt'), buildRobotsTxt({ baseUrl: BASE_URL }), 'utf8');
  await fs.writeFile(path.join(publicDir, 'google-merchant-feed.tsv'), buildMerchantFeedTsv(products, { baseUrl: BASE_URL }), 'utf8');
  await fs.writeFile(path.join(publicDir, 'product-seo-index.json'), JSON.stringify(products), 'utf8');
}

async function writeDistArtifacts(products) {
  const indexPath = path.join(distDir, 'index.html');
  const indexHtml = await fs.readFile(indexPath, 'utf8');
  const plantRoot = path.join(distDir, 'plant');

  await fs.writeFile(path.join(distDir, 'sitemap.xml'), buildSitemapXml(products, { baseUrl: BASE_URL }), 'utf8');
  await fs.writeFile(path.join(distDir, 'robots.txt'), buildRobotsTxt({ baseUrl: BASE_URL }), 'utf8');
  await fs.writeFile(path.join(distDir, 'google-merchant-feed.tsv'), buildMerchantFeedTsv(products, { baseUrl: BASE_URL }), 'utf8');
  await fs.writeFile(path.join(distDir, 'product-seo-index.json'), JSON.stringify(products), 'utf8');

  await fs.rm(plantRoot, { recursive: true, force: true });

  const publicProducts = products.filter((product) => product?.id && product.available !== false);
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
  const products = await readProducts();

  await writePublicArtifacts(products);

  if (!args.has('--public-only')) {
    try {
      await fs.access(path.join(distDir, 'index.html'));
      await writeDistArtifacts(products);
    } catch (error) {
      if (args.has('--dist')) throw error;
      console.warn('Skipping dist SEO pages because dist/index.html is not available yet.');
    }
  }

  console.log(`Generated sitemap, robots.txt, and Merchant Center feed for ${products.length} products`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
