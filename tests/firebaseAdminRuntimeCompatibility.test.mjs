import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('Firebase Admin JWKS verifier uses a pre-v6 jose package with CommonJS exports', () => {
  const jwksPackage = require.resolve('jwks-rsa/package.json');
  const joseEntry = require.resolve('jose', { paths: [dirname(jwksPackage)] });
  let packageDirectory = dirname(joseEntry);
  while (!existsSync(join(packageDirectory, 'package.json'))) {
    const parent = dirname(packageDirectory);
    assert.notEqual(parent, packageDirectory, 'jose package root must be discoverable');
    packageDirectory = parent;
  }
  const josePackage = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8'));

  assert.equal(josePackage.name, 'jose');
  assert.ok(Number.parseInt(josePackage.version, 10) < 6);
});
