import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'src', 'main.jsx'), 'utf8');
const viteSource = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8');

test('web app bypasses the HTTP cache when checking for a service-worker release', () => {
  assert.match(
    mainSource,
    /navigator\.serviceWorker[\s\S]*?\.register\(`\/sw\.js\?update=\$\{Date\.now\(\)\}`\)/
  );
  assert.match(mainSource, /navigator\.serviceWorker\.addEventListener\('controllerchange'/);
  assert.match(mainSource, /window\.location\.reload\(\)/);
});

test('Workbox removes caches created by outdated releases', () => {
  assert.match(viteSource, /cleanupOutdatedCaches:\s*true/);
  assert.match(viteSource, /skipWaiting:\s*true/);
  assert.match(viteSource, /clientsClaim:\s*true/);
});
