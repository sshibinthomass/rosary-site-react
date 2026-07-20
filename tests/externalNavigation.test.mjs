import assert from 'node:assert/strict';
import test from 'node:test';

import { createExternalUrlOpener } from '../src/utils/externalNavigation.js';

test('treats a blocked browser popup as a failed handoff', async () => {
  const openExternalUrl = createExternalUrlOpener({
    isNativePlatform: () => false,
    openBrowser: () => null,
    openNative: async () => {},
  });

  await assert.rejects(
    openExternalUrl('https://wa.me/example'),
    /could not be opened/i,
  );
});

test('treats a generic native launcher rejection as a failed handoff', async () => {
  const nativeError = new Error('plugin rejected');
  const openExternalUrl = createExternalUrlOpener({
    isNativePlatform: () => true,
    openBrowser: () => assert.fail('browser opener must not run'),
    openNative: async () => { throw nativeError; },
  });

  await assert.rejects(openExternalUrl('https://wa.me/example'), (error) => error === nativeError);
});

test('treats an explicit negative native launcher result as a failed handoff', async () => {
  const openExternalUrl = createExternalUrlOpener({
    isNativePlatform: () => true,
    openBrowser: () => assert.fail('browser opener must not run'),
    openNative: async () => ({ completed: false }),
  });

  await assert.rejects(
    openExternalUrl('https://wa.me/example'),
    /could not be opened/i,
  );
});

test('returns positive success only after the selected launcher accepts the URL', async () => {
  const browserWindow = {};
  const openExternalUrl = createExternalUrlOpener({
    isNativePlatform: () => false,
    openBrowser: () => browserWindow,
    openNative: async () => {},
  });

  assert.equal(await openExternalUrl('https://wa.me/example'), true);
});
