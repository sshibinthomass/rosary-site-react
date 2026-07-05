import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const shopPageSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'ShopPage.jsx'), 'utf8');

const expectedShopCategoryBackgrounds = [
  ['All', '/shop/category-backgrounds/all.jpg'],
  ['Limited', '/shop/category-backgrounds/limited.jpg'],
  ['Succulent', '/shop/category-backgrounds/succulent.jpg'],
  ['Cactus', '/shop/category-backgrounds/cactus.jpg'],
  ['Echeveria', '/shop/category-backgrounds/echeveria.jpg'],
  ['Jade', '/shop/category-backgrounds/jade.jpg'],
  ['Crassula', '/shop/category-backgrounds/crassula.jpg'],
  ['Peperomia', '/shop/category-backgrounds/peperomia.jpg'],
  ['Aloe', '/shop/category-backgrounds/aloe.jpg'],
  ['Sedum', '/shop/category-backgrounds/sedum.jpg'],
  ['Haworthia', '/shop/category-backgrounds/haworthia.jpg'],
  ['Creeper', '/shop/category-backgrounds/creeper.jpg'],
  ['Sansevieria', '/shop/category-backgrounds/sansevieria.jpg'],
  ['Indoor', '/shop/category-backgrounds/indoor.jpg'],
  ['Hanging', '/shop/category-backgrounds/hanging.jpg'],
  ['Mother', '/shop/category-backgrounds/mother.jpg'],
  ['Combo', '/shop/category-backgrounds/combo.jpg'],
  ['Others', '/shop/category-backgrounds/others.jpg'],
];

test('shop page does not render removed advanced filter controls', () => {
  assert.doesNotMatch(shopPageSource, /aria-label="Watering"/);
  assert.doesNotMatch(shopPageSource, /aria-label="Sunlight"/);
  assert.doesNotMatch(shopPageSource, /aria-label="Transit"/);
  assert.doesNotMatch(shopPageSource, /aria-label="Minimum price"/);
  assert.doesNotMatch(shopPageSource, /aria-label="Maximum price"/);
  assert.doesNotMatch(shopPageSource, /aria-label="Sort products"/);
  assert.doesNotMatch(shopPageSource, />Clear filters</);
});

test('shop page copy no longer promises filter controls', () => {
  assert.doesNotMatch(shopPageSource, /Use filters/i);
  assert.doesNotMatch(shopPageSource, /Search, filter and choose/i);
});

test('shop hero has a generated background for every selectable category', () => {
  assert.match(shopPageSource, /const SHOP_CATEGORY_BACKGROUNDS = Object\.freeze\(\{/);
  assert.match(shopPageSource, /const shopHeroBackground = SHOP_CATEGORY_BACKGROUNDS\[selectedCategory\]/);
  assert.match(shopPageSource, /style=\{shopHeroStyle\}/);

  for (const [category, imagePath] of expectedShopCategoryBackgrounds) {
    const keyPattern = new RegExp(`['"]${category}['"]:\\s*'${imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
    assert.match(shopPageSource, keyPattern, `${category} should map to ${imagePath}`);

    const localImagePath = path.join(projectRoot, 'public', imagePath.slice(1));
    assert.ok(fs.existsSync(localImagePath), `${imagePath} should exist in public assets`);
  }
});
