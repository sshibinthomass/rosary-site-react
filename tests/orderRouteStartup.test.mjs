import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'context', 'AuthContext.jsx'),
  'utf8'
);

test('singular order links initialize Firebase Auth immediately', () => {
  assert.match(authSource, /\^\\\/\(account\|admin\|orders\|order\|care\)/);
});
