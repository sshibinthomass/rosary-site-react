import { buildVercelConfig } from './scripts/vercel-config.mjs';
import products from './src/data/products.json' with { type: 'json' };

export const config = buildVercelConfig(products);
