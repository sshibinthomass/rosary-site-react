import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const functionsRoot = path.resolve(directory, '..');
const catalogPath = path.resolve(functionsRoot, '..', 'plant-care-app', 'src', 'data', 'species.generated.json');
const outputPath = path.resolve(functionsRoot, 'src', 'productLinks.generated.json');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const links = Object.fromEntries(catalog.map((plant) => [String(plant.productId), { speciesId: plant.id, category: plant.category }]));
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(links, null, 2)}\n`, 'utf8');
process.stdout.write(`Generated ${Object.keys(links).length} Rosary product links.\n`);
