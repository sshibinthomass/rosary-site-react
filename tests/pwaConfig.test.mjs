import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'src', 'main.jsx'), 'utf8');
const viteSource = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8');

test('web app registers service-worker updates immediately', () => {
  assert.match(mainSource, /import \{ registerSW \} from 'virtual:pwa-register'/);
  assert.match(mainSource, /registerSW\(\{[\s\S]*?immediate:\s*true/);
  assert.match(mainSource, /onNeedRefresh\(\)[\s\S]*?updateSW\(true\)/);
});

test('Workbox removes caches created by outdated releases', () => {
  assert.match(viteSource, /cleanupOutdatedCaches:\s*true/);
});
