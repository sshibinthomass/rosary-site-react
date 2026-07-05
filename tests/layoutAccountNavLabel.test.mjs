import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const layoutSource = fs.readFileSync('src/components/Layout.jsx', 'utf8');

test('layout account navigation label follows login state everywhere', () => {
  assert.match(
    layoutSource,
    /const\s+accountNavLabel\s*=\s*user\s*\?\s*'Account'\s*:\s*'Log in';/
  );

  assert.match(
    layoutSource,
    /const\s+mainNavItems\s*=\s*navItems\.map\(\(item\)\s*=>\s*item\.path === '\/account'/s
  );

  assert.match(
    layoutSource,
    /\{\s*path:\s*'\/account',\s*label:\s*accountNavLabel,\s*Icon:\s*UserIcon\s*\}/
  );

  assert.doesNotMatch(layoutSource, /label:\s*user\s*\?\s*'Orders'\s*:\s*'Account'/);
});

test('mobile header includes the account navigation action', () => {
  assert.match(
    layoutSource,
    /<div className="md:hidden flex items-center gap-2 shrink-0">[\s\S]*<NavLink\s+to="\/account"[\s\S]*aria-label=\{accountNavLabel\}/
  );

  assert.match(
    layoutSource,
    /<span className="text-xs font-semibold">\{accountNavLabel\}<\/span>/
  );
});
