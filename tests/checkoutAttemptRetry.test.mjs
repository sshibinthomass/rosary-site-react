import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const lifecycleSource = await readFile(
  new URL('../src/components/AppLifecycle.jsx', import.meta.url),
  'utf8',
);

test('app lifecycle retries queued checkout diagnostics without exposing failures', () => {
  assert.match(
    lifecycleSource,
    /import\s+\{\s*flushCheckoutAttemptOutbox\s*\}\s+from\s+['"]\.\.\/services\/checkoutAttemptService['"];/,
  );
  assert.match(
    lifecycleSource,
    /const flushCheckoutDiagnostics = \(\) => \{\s*try \{\s*void flushCheckoutAttemptOutbox\(window\.localStorage\)\.catch\([\s\S]*?\);\s*\} catch \(error\) \{\s*console\.warn\('Checkout diagnostic retry warning:', error\);\s*\}/,
  );
  assert.match(lifecycleSource, /flushCheckoutDiagnostics\(\);\s*refreshCatalog\('app-open'\);/);
  assert.match(
    lifecycleSource,
    /if \(document\.visibilityState === 'visible'\) \{\s*flushCheckoutDiagnostics\(\);\s*refreshCatalog\('visible'\);/s,
  );
  assert.match(lifecycleSource, /const handleFocus = \(\) => \{\s*flushCheckoutDiagnostics\(\);\s*refreshCatalog\('focus'\);\s*\};/s);
  assert.match(lifecycleSource, /window\.addEventListener\('online', flushCheckoutDiagnostics\);/);
  assert.match(lifecycleSource, /window\.removeEventListener\('online', flushCheckoutDiagnostics\);/);
  assert.match(
    lifecycleSource,
    /CapacitorApp\.addListener\('resume', \(\) => \{\s*flushCheckoutDiagnostics\(\);\s*refreshCatalog\('resume'\);\s*\}\)/s,
  );
});
