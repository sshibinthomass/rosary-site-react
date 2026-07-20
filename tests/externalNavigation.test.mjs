import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createExternalNavigation,
  createExternalUrlOpener,
} from '../src/utils/externalNavigation.js';

const moduleUrl = new URL('../src/utils/externalNavigation.js', import.meta.url);

test('reserves one browser handle synchronously and navigates that exact handle without reopening', async () => {
  const openCalls = [];
  const browserWindow = {
    opener: { unsafe: true },
    location: { href: 'about:blank' },
  };
  const navigation = createExternalNavigation({
    isNativePlatform: () => false,
    openBrowser: (...args) => {
      openCalls.push(args);
      return browserWindow;
    },
    openNative: async () => assert.fail('native launcher must not run'),
  });

  const reservation = navigation.reserveExternalUrlWindow();
  assert.equal(reservation.status, 'reserved');
  assert.equal(reservation.handle, browserWindow);
  assert.deepEqual(openCalls, [['', '_blank']]);

  const opening = navigation.openExternalUrl('https://wa.me/example', reservation);
  assert.equal(browserWindow.opener, null);
  assert.equal(browserWindow.location.href, 'https://wa.me/example');
  assert.deepEqual(openCalls, [['', '_blank']]);
  assert.equal(await opening, true);
});

test('a blocked reservation keeps a stable error and never attempts a late second popup', async () => {
  let openCalls = 0;
  const navigation = createExternalNavigation({
    isNativePlatform: () => false,
    openBrowser: () => {
      openCalls += 1;
      return null;
    },
    openNative: async () => assert.fail('native launcher must not run'),
  });

  const reservation = navigation.reserveExternalUrlWindow();
  assert.equal(reservation.status, 'blocked');
  assert.equal(reservation.error.code, 'whatsapp-launch-failed');

  await assert.rejects(
    navigation.openExternalUrl('https://wa.me/example', reservation),
    (error) => error === reservation.error,
  );
  assert.equal(openCalls, 1);
});

test('native reservation never opens a browser window', async () => {
  let browserCalls = 0;
  const navigation = createExternalNavigation({
    isNativePlatform: () => true,
    openBrowser: () => {
      browserCalls += 1;
      return {};
    },
    openNative: async (url) => {
      assert.equal(url, 'https://wa.me/example');
      return { completed: true };
    },
  });

  const reservation = navigation.reserveExternalUrlWindow();
  assert.equal(reservation.status, 'native');
  assert.equal(browserCalls, 0);
  assert.equal(await navigation.openExternalUrl('https://wa.me/example', reservation), true);
  assert.equal(browserCalls, 0);
});

test('direct web opening reserves and navigates synchronously for click-driven retries', async () => {
  const browserWindow = { opener: {}, location: { href: 'about:blank' } };
  const navigation = createExternalNavigation({
    isNativePlatform: () => false,
    openBrowser: () => browserWindow,
    openNative: async () => assert.fail('native launcher must not run'),
  });

  const opening = navigation.openExternalUrl('https://wa.me/example');
  assert.equal(browserWindow.opener, null);
  assert.equal(browserWindow.location.href, 'https://wa.me/example');
  assert.equal(await opening, true);
});

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
