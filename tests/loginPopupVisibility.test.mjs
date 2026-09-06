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
});

test('the wait is counted from the page opening, not from auth resolving', () => {
  // Auth is deferred on public pages until the visitor interacts or ten idle
  // seconds pass, so gating the timer on it pushed the sheet ~27s out.
  assert.match(loginPopupSource, /setTimeout\(\(\) => setWaited\(true\), 4000\)/);
  assert.match(loginPopupSource, /\}, \[\]\);/);
  assert.doesNotMatch(loginPopupSource, /if \(loading \|\| user\) return undefined;/);
});

test('the sheet still stays out of the way once it is closed or signed in', () => {
  assert.match(loginPopupSource, /const handleClose = \(\) => \{\s*setDismissed\(true\);\s*\};/);
  assert.match(
    loginPopupSource,
    /const visible = waited && !dismissed && !loading && !user && !pathname\.startsWith\('\/order\/'\);/
  );
  assert.match(loginPopupSource, /if \(!visible\) return null;/);
});

test('the desktop sheet is a centred two-column card, not a cropped phone sheet', () => {
  assert.match(loginPopupSource, /md:items-center/);
  assert.match(loginPopupSource, /md:grid md:max-w-3xl md:grid-cols-\[1\.05fr_1fr\] md:rounded-\[28px\]/);
  // The drag handle means nothing with a mouse; a close button and Escape do.
  assert.match(loginPopupSource, /flex justify-center md:hidden/);
  assert.match(loginPopupSource, /aria-label="Close"/);
  assert.match(loginPopupSource, /event\.key === 'Escape'/);
});
