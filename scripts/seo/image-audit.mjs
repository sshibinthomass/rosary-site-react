import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_SEO_IMAGE_PATH,
  HERO_SEO_IMAGE_PATH,
  PLACEHOLDER_PLANT_IMAGE_PATH,
  getPrimaryProductImage,
} from '../../src/utils/productSeo.js';
import {
  CONTENT_HUBS,
  getContentHubImage,
} from '../../src/utils/contentHubs.js';

const __filename = fileURLToPath(import.meta.url);
const defaultRootDir = path.resolve(path.dirname(__filename), '..', '..');

const REQUIRED_ASSETS = Object.freeze([
  DEFAULT_SEO_IMAGE_PATH,
  HERO_SEO_IMAGE_PATH,
  PLACEHOLDER_PLANT_IMAGE_PATH,
]);

function publicRelativePath(publicPath) {
  return path.join('public', String(publicPath).replace(/^\//, ''));
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function auditRequiredAssets({ rootDir, errors, checkedAssets }) {
  for (const publicPath of REQUIRED_ASSETS) {
    const relativePath = publicRelativePath(publicPath);
    checkedAssets.push(relativePath.replaceAll(path.sep, '/'));

    if (!await fileExists(path.join(rootDir, relativePath))) {
      errors.push(`${relativePath.replaceAll(path.sep, '/')} is missing or empty.`);
    }
  }
}

async function auditProductImages({ rootDir, errors }) {
  const productsPath = path.join(rootDir, 'src', 'data', 'products.json');
  const products = await readJson(productsPath);
  let checkedProducts = 0;

  for (const product of products) {
    const imagePath = getPrimaryProductImage(product);
    if (!imagePath || /^https?:\/\//i.test(imagePath)) continue;

    checkedProducts += 1;
    const relativePath = publicRelativePath(imagePath);
    if (!await fileExists(path.join(rootDir, relativePath))) {
      errors.push(`Product ${product.id || '(missing id)'} references missing image ${relativePath.replaceAll(path.sep, '/')}.`);
    }
  }

  return checkedProducts;
}

async function auditGuideImages({ rootDir, errors, checkedAssets }) {
  const guideImagePaths = new Set(CONTENT_HUBS.map(getContentHubImage).filter(Boolean));

  for (const publicPath of guideImagePaths) {
    const relativePath = publicRelativePath(publicPath);
    checkedAssets.push(relativePath.replaceAll(path.sep, '/'));

    if (!await fileExists(path.join(rootDir, relativePath))) {
      errors.push(`Guide image ${relativePath.replaceAll(path.sep, '/')} is missing or empty.`);
    }
  }

  return guideImagePaths.size;
}

async function auditMerchantFeed({ rootDir, errors }) {
  const feedPath = path.join(rootDir, 'public', 'google-merchant-feed.tsv');

  try {
    const feed = await fs.readFile(feedPath, 'utf8');
    if (/https:\/\/rosaryplanthouse\.com\/public\/sale_plants\//.test(feed)) {
      errors.push('Merchant feed contains /public/sale_plants image URLs.');
    }
  } catch {
    errors.push('public/google-merchant-feed.tsv is missing.');
  }
}

export async function auditImageSeo({ rootDir = defaultRootDir } = {}) {
  const errors = [];
  const checkedAssets = [];

  await auditRequiredAssets({ rootDir, errors, checkedAssets });
  const checkedGuideImages = await auditGuideImages({ rootDir, errors, checkedAssets });
  const checkedProducts = await auditProductImages({ rootDir, errors });
  await auditMerchantFeed({ rootDir, errors });

  return {
    errors,
    checkedAssets,
    checkedGuideImages,
    checkedProducts,
  };
}

async function main() {
  const report = await auditImageSeo();

  if (report.errors.length > 0) {
    console.error('Image SEO audit failed:');
    for (const error of report.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Image SEO audit passed for ${report.checkedAssets.length} global/guide assets, ${report.checkedGuideImages} guide image groups, and ${report.checkedProducts} local product images.`);
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
