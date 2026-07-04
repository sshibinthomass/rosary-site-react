import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const cssSource = fs.readFileSync('src/index.css', 'utf8');
const productCareDetailsSource = fs.readFileSync('src/components/ProductCareDetails.jsx', 'utf8');
const productCareSignalsSource = fs.readFileSync('src/components/ProductCareSignals.jsx', 'utf8');
const productLineArtSource = fs.readFileSync('src/components/ProductLineArt.jsx', 'utf8');

test('Tailwind dark utilities follow the app theme class instead of system color scheme', () => {
  assert.match(
    cssSource,
    /@custom-variant\s+dark\s*\([^;]*:where\(\.dark,\s*\.dark\s+\*\)[^;]*\);/s,
    'Tailwind dark: utilities should only apply under the app-controlled .dark class'
  );
});

test('plant care line-art icons use theme text color instead of black and white overrides', () => {
  const careSources = `${productCareDetailsSource}\n${productCareSignalsSource}`;

  assert.doesNotMatch(careSources, /text-black(?:\s+[^"']*)?dark:text-white/);
  assert.doesNotMatch(careSources, /border-black(?:\s+[^"']*)?dark:border-white/);
  assert.match(careSources, /text-\[var\(--text-primary\)\]/);
});

test('product line-art SVG strokes default to the readable theme color', () => {
  assert.match(productLineArtSource, /stroke:\s*'var\(--text-primary\)'/);
  assert.doesNotMatch(productLineArtSource, /stroke:\s*'currentColor'/);
});
