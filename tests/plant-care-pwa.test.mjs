import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const viteSource = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../public/site.webmanifest', import.meta.url), 'utf8'));
const capacitor = JSON.parse(await readFile(new URL('../capacitor.config.json', import.meta.url), 'utf8'));

test('the root Rosary app owns one auto-updating service worker', () => {
  assert.match(viteSource, /VitePWA\(/);
  assert.match(viteSource, /registerType:\s*'autoUpdate'/);
  assert.match(viteSource, /navigateFallback:\s*'index\.html'/);
  assert.match(viteSource, /open-meteo/);
  assert.match(mainSource, /registerSW/);
  assert.match(mainSource, /immediate:\s*true/);
});

test('the install identity remains the existing Rosary app', () => {
  assert.equal(manifest.name, 'Rosary Plant House');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.match(manifest.description, /plant care/i);
  assert.equal(capacitor.appId, 'com.rosaryplants.app');
  assert.equal(capacitor.appName, 'Rosary Plants');
});
