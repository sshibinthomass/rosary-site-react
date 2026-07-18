import { readFileSync } from 'node:fs';

import { buildVercelConfig } from './scripts/vercel-config.mjs';

const products = JSON.parse(
  readFileSync(new URL('./src/data/products.json', import.meta.url), 'utf8')
);

export const config = buildVercelConfig(products);
