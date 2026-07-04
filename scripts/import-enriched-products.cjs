const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DEFAULT_SOURCE = 'D:/Plants/plant-Codex/final.xlsx';
const sourcePath = path.resolve(process.argv[2] || process.env.SEO_XLSX_PATH || DEFAULT_SOURCE);
const rootDir = path.resolve(__dirname, '..');
const targetFiles = [
  path.join(rootDir, 'scripts', 'products.json'),
  path.join(rootDir, 'src', 'data', 'products.json'),
];

async function main() {
  if (!fs.existsSync(sourcePath)) {
    console.error(`SEO workbook not found: ${sourcePath}`);
    process.exit(1);
  }

  const { mergeEnrichmentRows } = await import('./seo/enrichment.mjs');

  const workbook = XLSX.readFile(sourcePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  for (const targetFile of targetFiles) {
    const products = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    const merged = mergeEnrichmentRows(products, rows);
    fs.writeFileSync(targetFile, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
    const enrichedCount = merged.filter((product) => product.seo || product.careGuide || product.faqs).length;
    console.log(`Updated ${path.relative(rootDir, targetFile)} with ${enrichedCount}/${merged.length} enriched products`);
  }

  console.log(`Imported SEO enrichment from ${sourcePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
