import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const accountPageSource = fs.readFileSync('src/pages/AccountPage.jsx', 'utf8');

const emojiGlyphs = Object.freeze([
  ['loading leaf', [0x1F33F]],
  ['guest avatar', [0x1F464]],
  ['cart stat', [0x1F6D2]],
  ['saved stat', [0x1F49A]],
  ['orders stat', [0x1F4E6]],
  ['reviews link', [0x2B50]],
  ['faq link', [0x1F914]],
  ['contact link', [0x1F4EC]],
  ['appearance setting', [0x1F313]],
  ['admin link', [0x2699, 0xFE0F]],
  ['pincode lookup', [0x1F50D]],
  ['logout toast', [0x1F44B]]
]);

test('account page uses monochrome inline icons instead of emoji glyphs', () => {
  for (const [label, codePoints] of emojiGlyphs) {
    const glyph = String.fromCodePoint(...codePoints);
    assert.equal(accountPageSource.includes(glyph), false, `${label} should not render an emoji glyph`);
  }

  assert.match(accountPageSource, /function\s+AccountIcon\(/);
  assert.match(accountPageSource, /fill="none"/);
  assert.match(accountPageSource, /stroke="currentColor"/);
  assert.match(accountPageSource, /text-\[var\(--text-primary\)\]/);

  for (const iconName of ['leaf', 'user', 'cart', 'heart', 'package', 'star', 'help', 'mail', 'appearance', 'settings', 'search']) {
    assert.match(accountPageSource, new RegExp(`<AccountIcon name="${iconName}"`), `missing ${iconName} account icon`);
  }
});
