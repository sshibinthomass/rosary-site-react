import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const products = JSON.parse(fs.readFileSync('src/data/products.json', 'utf8'));
const scriptProducts = JSON.parse(fs.readFileSync('scripts/products.json', 'utf8'));
const publicProducts = JSON.parse(fs.readFileSync('public/product-seo-index.json', 'utf8'));

const FIREBASE_OWNED_PRODUCT_FIELDS = [
  'available',
  'salesPrice',
  'imageUrl',
  'size',
  'originalPrice',
  'category',
  'qtyAvailable',
  'price',
  'inStock',
  'combo',
  'demand',
  'hanging',
  'indoor',
  'isRestocked',
  'mother',
  'placeAvailable',
  'transit',
];

const FIREBASE_OWNED_TOP_LEVEL_IDENTITY_FIELDS = [
  'commonName',
  'name',
  'title',
];

const PUBLIC_TEXT_FIELDS = [
  ['seo.metaTitle', (product) => product.seo?.metaTitle],
  ['seo.metaDescription', (product) => product.seo?.metaDescription],
  ['seo.h1', (product) => product.seo?.h1],
  ['careGuide.plantName', (product) => product.careGuide?.plantName],
  ['careGuide.seoProductName', (product) => product.careGuide?.seoProductName],
  ['careGuide.scientificName', (product) => product.careGuide?.scientificName],
  ['careGuide.shortDescription', (product) => product.careGuide?.shortDescription],
  ['careGuide.longDescription', (product) => product.careGuide?.longDescription],
  ['careGuide.quickAnswer', (product) => product.careGuide?.quickAnswer],
  ['schema.name', (product) => product.schema?.name],
  ['schema.description', (product) => product.schema?.description],
  ['merchant.title', (product) => product.merchant?.title],
  ['merchant.description', (product) => product.merchant?.description],
];

const INTERNAL_REVIEW_TEXT = /visible in the image label|listed from the plant name|final taxonomy checked|taxonomy check|label-derived name|source flag|human-review|Plant Details sheet|skill-column|readable image text label/i;
const AWKWARD_UNCERTAINTY_TEXT = /exact species\s+naming|species\s+naming\s*,|broad .* care remains the safer guidance/i;
const KNOWN_OCR_TEXT = /Fingure|Cofss|Stfyn|Haworthiareonium|Akma Lia|Echeviria\b|Pachychyllum/i;
const REVIEWED_TITLE_DECISIONS = {
  58: 'Scilla siberica',
  104: 'Euphorbia milii',
  116: 'Aloe x spinosissima',
  129: 'Sedum adolphii group',
  160: "Echeveria 'Perle von Nurnberg'",
  172: 'Peperomia ferreyrae or similar group',
  226: 'Dracaena reflexa or related group',
  244: "Peperomia obtusifolia 'Variegata'",
  254: 'Alternanthera ficoidea group',
  297: "Crassula ovata 'Gollum' group",
  304: 'Crassula muscosa',
  310: 'Haworthiopsis limifolia',
};

function collectFieldMatches(pattern) {
  const matches = [];
  for (const product of products) {
    for (const [field, getter] of PUBLIC_TEXT_FIELDS) {
      const value = getter(product);
      if (value && pattern.test(String(value))) {
        matches.push(`${product.id} ${field}: ${value}`);
      }
    }
  }
  return matches;
}

test('local product JSON does not duplicate Firebase-owned storefront fields', () => {
  function collectRepeatedFieldPaths(value, prefix = '') {
    if (!value || typeof value !== 'object') return [];

    const matches = [];
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (FIREBASE_OWNED_PRODUCT_FIELDS.includes(key)) {
        matches.push(path);
      }
      if (child && typeof child === 'object') {
        matches.push(...collectRepeatedFieldPaths(child, path));
      }
    }
    return matches;
  }

  for (const [label, dataset] of [
    ['src/data/products.json', products],
    ['scripts/products.json', scriptProducts],
    ['public/product-seo-index.json', publicProducts],
  ]) {
    const repeatedFields = dataset.flatMap((product) =>
      collectRepeatedFieldPaths(product).map((field) => `${label}:${product.id}:${field}`)
    );

    assert.deepEqual(repeatedFields, []);
  }
});

test('local product JSON does not duplicate Firebase-owned identity fields at the top level', () => {
  for (const [label, dataset] of [
    ['src/data/products.json', products],
    ['scripts/products.json', scriptProducts],
    ['public/product-seo-index.json', publicProducts],
  ]) {
    const repeatedFields = dataset.flatMap((product) =>
      FIREBASE_OWNED_TOP_LEVEL_IDENTITY_FIELDS
        .filter((field) => Object.hasOwn(product, field))
        .map((field) => `${label}:${product.id}:${field}`)
    );

    assert.deepEqual(repeatedFields, []);
  }
});

test('product data does not expose review workflow or OCR placeholder wording', () => {
  assert.deepEqual(collectFieldMatches(INTERNAL_REVIEW_TEXT), []);
  assert.deepEqual(collectFieldMatches(AWKWARD_UNCERTAINTY_TEXT), []);
  assert.deepEqual(collectFieldMatches(KNOWN_OCR_TEXT), []);
});

test('reviewed botanical decisions stay in SEO identity fields after storefront identity is removed', () => {
  const productsById = new Map(products.map((product) => [String(product.id), product]));

  for (const [id, title] of Object.entries(REVIEWED_TITLE_DECISIONS)) {
    const product = productsById.get(id);
    const identityValues = [
      product?.careGuide?.plantName,
      product?.careGuide?.scientificName,
      product?.schema?.name,
      product?.merchant?.title,
    ].filter(Boolean).join('\n');

    assert.match(identityValues, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Missing reviewed identity for product ${id}`);
  }
});
