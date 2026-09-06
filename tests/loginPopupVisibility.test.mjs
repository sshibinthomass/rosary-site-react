import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loginPopupSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'components', 'LoginPopup.jsx'),
  'utf8'
);

test('a signed-out visitor is offered sign-in every time they open the site', () => {
  // Dismissing used to be remembered for the whole tab session, so a visitor
  // who closed it once was never asked again until they opened a new tab.
  assert.doesNotMatch(loginPopupSource, /loginPopupDismissed/);
  assert.doesNotMatch(loginPopupSource, /sessionStorage/);
  assert.match(loginPopupSource, /if \(loading \|\| user\) return undefined;/);
  assert.match(loginPopupSource, /setTimeout\(\(\) => setShow\(true\), 15000\)/);
});

test('the sheet still stays out of the way once it is closed or signed in', () => {
  assert.match(loginPopupSource, /const handleClose = \(\) => \{\s*setShow\(false\);\s*\};/);
  assert.match(loginPopupSource, /if \(!show \|\| user \|\| pathname\.startsWith\('\/order\/'\)\) return null;/);
});
