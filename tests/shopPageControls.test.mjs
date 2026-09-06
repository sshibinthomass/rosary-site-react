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

test('shop smart search placeholder does not mention retired suggestion labels', () => {
  assert.doesNotMatch(shopPageSource, /Search plants by name or category, low water, beginner/i);
});

test('shop page does not render retired smart search suggestion chips', () => {
  assert.doesNotMatch(shopPageSource, /aria-label="Smart search suggestions"/);
  assert.match(shopPageSource, /const SEARCH_PLACEHOLDER = 'Search plants by name, category, care need, or budget\.\.\.'/);
  assert.doesNotMatch(shopPageSource, /placeholder="Search plants by name, category, cactus, indoor, under 100\.\.\."/);
  assert.doesNotMatch(shopPageSource, />\s*indoor\s*</i);
  assert.doesNotMatch(shopPageSource, />\s*hanging\s*</i);
  assert.doesNotMatch(shopPageSource, />\s*under 100\s*</i);
  assert.doesNotMatch(shopPageSource, />\s*gift under 60\s*</i);
});

test('shop search shows five verified example queries below the input', () => {
  assert.match(shopPageSource, /const SMART_SEARCH_EXAMPLES = Object\.freeze\(\[/);
  assert.match(shopPageSource, /aria-label="Smart search examples"/);
  assert.match(shopPageSource, />\s*Try:\s*</);
  assert.match(shopPageSource, /onClick=\{\(\) => setSearchQuery\(example\)\}/);

  for (const example of ['low water', 'low light', 'flowering', 'cactus', 'under 60']) {
    assert.match(shopPageSource, new RegExp(`['"]${example}['"]`));
    assert.match(shopPageSource, new RegExp(`>\\s*\\{example\\}\\s*<`));
  }

  assert.doesNotMatch(shopPageSource, /['"]gift under 60['"]/);
});

test('shop search animates an empty-input typewriter placeholder from verified examples', () => {
  assert.match(shopPageSource, /const SEARCH_PLACEHOLDER = 'Search plants by name, category, care need, or budget\.\.\.'/);
  assert.match(shopPageSource, /const TYPEWRITER_HINT_DELAYS = Object\.freeze\(\{/);
  assert.match(shopPageSource, /const \[typewriterHint, setTypewriterHint\] = useState/);
  assert.match(shopPageSource, /const \[prefersReducedMotion, setPrefersReducedMotion\] = useState\(false\)/);
  assert.match(shopPageSource, /const animatedSearchPlaceholder = searchQuery\.trim\(\)/);
  assert.match(shopPageSource, /placeholder=\{animatedSearchPlaceholder\}/);
  assert.match(shopPageSource, /setTypewriterHint\(\(previousHint\) =>/);
  assert.match(shopPageSource, /SMART_SEARCH_EXAMPLES\[typewriterHint\.index\]/);
});

test('shop search loads local enrichment for care-need queries', () => {
  assert.match(shopPageSource, /mergeProductWithLocalEnrichment/);
  assert.match(shopPageSource, /fetch\('\/product-seo-index\.json'/);
  assert.match(shopPageSource, /searchEnrichmentById/);
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

const homePageSource = fs.readFileSync(path.join(projectRoot, 'src', 'pages', 'HomePage.jsx'), 'utf8');
const productCardSource = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'ProductCard.jsx'), 'utf8');
const storefrontSource = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'storefront.jsx'), 'utf8');

test('shop sort is a dropdown listing every sort order', () => {
  assert.match(shopPageSource, /aria-label="Sort plants"/);
  assert.match(shopPageSource, /SORT_OPTIONS\.map\(\(option\) => \(\s*<option/);
  assert.doesNotMatch(shopPageSource, /cycleSortOrder/);
  for (const sortId of ['oldest', 'newest', 'price-asc', 'price-desc', 'name-asc']) {
    assert.match(shopPageSource, new RegExp(`id: '${sortId}'`));
  }
});

test('shop loads the whole catalogue so the id sorts can be trusted', () => {
  // A paged fetch returns Firestore's lexicographic id order, which cannot be
  // sorted or counted honestly.
  assert.doesNotMatch(shopPageSource, /getProductsPage/);
  assert.match(shopPageSource, /getSortableProductId\(b\) - getSortableProductId\(a\)/);
  assert.match(shopPageSource, /getSortableProductId\(a\) - getSortableProductId\(b\)/);
});

test('the shop opens on plant #1 and counts upwards', () => {
  assert.match(shopPageSource, /const SORT_OPTIONS = Object\.freeze\(\[\s*\{ id: 'oldest'/);
  assert.match(shopPageSource, /useState\(SORT_OPTIONS\[0\]\.id\)/);
});

test('home search hands the typed query to the shop instead of leaving on tap', () => {
  assert.match(homePageSource, /role="search"/);
  assert.match(homePageSource, /navigate\(query \? `\/shop\?q=\$\{encodeURIComponent\(query\)\}` : '\/shop'\)/);
  assert.doesNotMatch(homePageSource, /<Link\s+to="\/shop"\s+className="flex min-h-11 w-full items-center gap-3 rounded-full/);
});

test('home shows the six newest plants on the bench', () => {
  assert.match(homePageSource, /getLatestProducts\(6\)/);
  assert.doesNotMatch(homePageSource, /getProductsPage/);
});

test('a plant already in the cart keeps quantity and remove controls', () => {
  assert.match(storefrontSource, /export function InCartControls/);
  assert.match(storefrontSource, /aria-label=\{removeLabel\}/);
  assert.match(productCardSource, /<InCartControls/);
  assert.match(productCardSource, /onRemove=\{handleRemoveFromCart\}/);
  // Stepping below one empties the line rather than sticking at one.
  assert.match(storefrontSource, /min=\{0\}/);
});
