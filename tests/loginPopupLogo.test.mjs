import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const loginPopupSource = fs.readFileSync('src/components/LoginPopup.jsx', 'utf8');
const leafGlyph = String.fromCodePoint(0x1F33F);

test('login popup uses the Rosary Plant House logo instead of the leaf emoji', () => {
  assert.match(loginPopupSource, /import\s+logo\s+from\s+'..\/assets\/logo\.png';/);
  assert.match(loginPopupSource, /<img[\s\S]*src=\{logo\}[\s\S]*alt="Rosary Plant House logo"/);
  assert.doesNotMatch(loginPopupSource, /<span className="text-5xl block mb-4">/);
  assert.equal(loginPopupSource.includes(leafGlyph), false, 'LoginPopup should not render or toast the leaf emoji');
});
