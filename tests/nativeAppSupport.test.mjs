import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getGoogleSignInStrategy,
  getShareableSiteBaseUrl,
  isNativeAppRuntime,
  ROSARY_SITE_BASE_URL,
} from '../src/utils/nativeAppSupport.js';
import { getNativeGoogleCredentialTokens } from '../src/utils/nativeGoogleAuth.js';

test('native runtime detection delegates to Capacitor when available', () => {
  assert.equal(isNativeAppRuntime({ isNativePlatform: () => true }), true);
  assert.equal(isNativeAppRuntime({ isNativePlatform: () => false }), false);
  assert.equal(isNativeAppRuntime(null), false);
});

test('Google sign-in uses native auth inside the Android app', () => {
  assert.equal(getGoogleSignInStrategy({ isNativePlatform: () => true }), 'native');
  assert.equal(getGoogleSignInStrategy({ isNativePlatform: () => false }), 'popup-first');
});

test('native Google auth requires an ID token or access token for Firebase JS auth', () => {
  assert.deepEqual(
    getNativeGoogleCredentialTokens({
      credential: {
        idToken: 'id-token',
        accessToken: 'access-token',
      },
    }),
    {
      idToken: 'id-token',
      accessToken: 'access-token',
    }
  );

  assert.throws(
    () => getNativeGoogleCredentialTokens({ credential: {} }),
    /did not return an ID token or access token/
  );
});

test('shareable order links never use the Capacitor local app origin', () => {
  assert.equal(
    getShareableSiteBaseUrl({
      origin: 'http://localhost',
      pathname: '/cart',
    }, { isNativePlatform: () => true }),
    ROSARY_SITE_BASE_URL
  );

  assert.equal(
    getShareableSiteBaseUrl({
      origin: 'https://rosaryplanthouse.com',
      pathname: '/shop',
    }, { isNativePlatform: () => false }),
    'https://rosaryplanthouse.com'
  );

  assert.equal(
    getShareableSiteBaseUrl({
      origin: 'https://example.github.io',
      pathname: '/rosary-site-react/shop',
    }, { isNativePlatform: () => false }),
    'https://example.github.io/rosary-site-react'
  );
});
