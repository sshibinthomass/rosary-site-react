import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptDirectory, '..');
const productsPath = path.resolve(appDirectory, '..', 'src', 'data', 'products.json');
const outputPath = path.resolve(appDirectory, 'src', 'data', 'species.generated.json');

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function categoryFor(careGuide) {
  const type = clean(careGuide.plantType).toLowerCase();
  const siteCategory = clean(careGuide.siteCategory).toLowerCase();

  if (type.includes('cactus') || siteCategory.includes('cactus')) return 'cactus';
  if (type.includes('succulent') || siteCategory.includes('succulent')) return 'succulent';
  if (
    type.includes('flower') ||
    type.includes('outdoor') ||
    siteCategory.includes('balcony') ||
    /excellent|ideal|best/i.test(clean(careGuide.balconySuitability))
  ) return 'balcony';
  return 'houseplant';
}

export function buildSpeciesCatalog(products) {
  return products
    .filter((product) => (
      product.identityVerified === true &&
      product.seoStatus === 'published' &&
      clean(product.careGuide?.plantName)
    ))
    .map((product) => {
      const care = product.careGuide;
      return {
        id: `rph-${product.id}`,
        productId: String(product.id),
        name: clean(care.plantName),
        scientificName: clean(care.scientificName),
        commonNames: Array.isArray(care.commonNames) ? care.commonNames : [],
        category: categoryFor(care),
        difficulty: clean(care.difficulty) || 'Moderate',
        sunlight: clean(care.sunlight),
        watering: clean(care.watering),
        soil: clean(care.soil),
        northIndiaNote: clean(care.northIndiaNote),
        southIndiaNote: clean(care.southIndiaNote),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

async function main() {
  const products = JSON.parse(await readFile(productsPath, 'utf8'));
  const catalog = buildSpeciesCatalog(products);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  process.stdout.write(`Generated ${catalog.length} plant profiles.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
