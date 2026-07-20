import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createExternalUrlOpener } from '../src/utils/externalNavigation.js';

const moduleUrl = new URL('../src/utils/externalNavigation.js', import.meta.url);

test('opens a blank browser target, clears its opener, and then navigates the handle', async () => {
  const calls = [];
  const browserWindow = {
    opener: { unsafe: true },
    location: { href: 'about:blank' },
  };
  const openExternalUrl = createExternalUrlOpener({
    isNativePlatform: () => false,
    openBrowser: (...args) => {
      calls.push(args);
      return browserWindow;
    },
    openNative: async () => assert.fail('native launcher must not run'),
  });

  assert.equal(await openExternalUrl('https://wa.me/example'), true);
  assert.deepEqual(calls, [['', '_blank']]);
  assert.equal(browserWindow.opener, null);
  assert.equal(browserWindow.location.href, 'https://wa.me/example');
});

test('treats a blocked blank browser popup as a stable failed handoff', async () => {
  const openExternalUrl = createExternalUrlOpener({
    isNativePlatform: () => false,
    openBrowser: () => null,
    openNative: async () => {},
  });

  await assert.rejects(
    openExternalUrl('https://wa.me/example'),
    (error) => error.code === 'whatsapp-launch-failed' && /could not be opened/i.test(error.message),
  );
});

test('closes the blank browser handle and throws the stable error when navigation fails', async () => {
  let closed = false;
  const location = {};
  Object.defineProperty(location, 'href', {
    set() { throw new Error('navigation rejected'); },
  });
  const browserWindow = {
    opener: { unsafe: true },
    location,
    close() { closed = true; },
  };
  const openExternalUrl = createExternalUrlOpener({
    isNativePlatform: () => false,
    openBrowser: () => browserWindow,
    openNative: async () => {},
  });

  await assert.rejects(
    openExternalUrl('https://wa.me/example'),
    (error) => error.code === 'whatsapp-launch-failed',
  );
  assert.equal(browserWindow.opener, null);
  assert.equal(closed, true);
});

test('the production browser adapter does not request noopener window features', async () => {
  const source = await readFile(moduleUrl, 'utf8');

  assert.match(source, /window\.open\(\.\.\.args\)/);
  assert.doesNotMatch(source, /window\.open\([^\n]*noopener/);
});

test('preserves a generic native launcher rejection as a failed handoff', async () => {
  const nativeError = new Error('plugin rejected');
  const openExternalUrl = createExternalUrlOpener({
    isNativePlatform: () => true,
    openBrowser: () => assert.fail('browser opener must not run'),
    openNative: async () => { throw nativeError; },
  });

  await assert.rejects(openExternalUrl('https://wa.me/example'), (error) => error === nativeError);
});

test('treats an explicit negative native launcher result as a stable failed handoff', async () => {
  const openExternalUrl = createExternalUrlOpener({
    isNativePlatform: () => true,
    openBrowser: () => assert.fail('browser opener must not run'),
    openNative: async () => ({ completed: false }),
  });

  await assert.rejects(
    openExternalUrl('https://wa.me/example'),
    (error) => error.code === 'whatsapp-launch-failed',
  );
});

test('returns positive success only after the native launcher accepts the URL', async () => {
  const openExternalUrl = createExternalUrlOpener({
    isNativePlatform: () => true,
    openBrowser: () => assert.fail('browser opener must not run'),
    openNative: async () => ({ completed: true }),
  });

  assert.equal(await openExternalUrl('https://wa.me/example'), true);
});
