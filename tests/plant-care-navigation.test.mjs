import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const layoutSource = await readFile(new URL('../src/components/Layout.jsx', import.meta.url), 'utf8');
const accountSource = await readFile(new URL('../src/pages/AccountPage.jsx', import.meta.url), 'utf8');

test('the five-item global navigation promotes Plant Care instead of Wishlist', () => {
  const navBlock = layoutSource.match(/const navItems = \[(.*?)\];/s)?.[1] ?? '';
  assert.match(navBlock, /path: '\/care', label: 'Plant Care'/);
  assert.doesNotMatch(navBlock, /path: '\/wishlist'/);
  assert.equal((navBlock.match(/path:/g) ?? []).length, 5);
  assert.match(layoutSource, /location\.pathname\.startsWith\('\/care'\)/);
});

test('wishlist stays accessible from the side menu and Account gains care shortcuts', () => {
  assert.match(layoutSource, /path: '\/wishlist', label: 'Wishlist'/);
  assert.match(accountSource, /to="\/wishlist"/);
  assert.match(accountSource, /to="\/care"/);
  assert.match(accountSource, /to="\/care\/benefits"/);
});

test('the mobile floating cart does not compete with the care workspace', () => {
  assert.match(layoutSource, /!location\.pathname\.startsWith\('\/care'\)/);
});
