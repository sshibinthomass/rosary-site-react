import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cartPageSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'CartPage.jsx'), 'utf8');

test('cart checkout flow uses order-request wording instead of payment-style checkout wording', () => {
  assert.match(cartPageSource, />\s*Enter delivery details\s*</);
  assert.match(cartPageSource, /Send order request on WhatsApp/);
  assert.match(cartPageSource, /Delivery charge will be confirmed on WhatsApp before payment/);

  assert.doesNotMatch(cartPageSource, />\s*Proceed to Checkout\s*</);
  assert.doesNotMatch(cartPageSource, /Order via WhatsApp/);
  assert.doesNotMatch(cartPageSource, />\s*Calculated at checkout\s*</);
});

test('cart checkout explains the next WhatsApp order steps', () => {
  assert.match(cartPageSource, />What happens next</);

  for (const step of [
    'Send your cart on WhatsApp',
    'We confirm availability and delivery charge',
    'You pay after confirmation',
    'Will be dispatched on nearest dispatch date.',
  ]) {
    assert.match(cartPageSource, new RegExp(`<li>${step}</li>`));
  }
});

test('cart saves delivery details with an inline checkbox instead of a modal', () => {
  assert.match(cartPageSource, /Save these details for next order/);
  assert.match(cartPageSource, /saveDetailsForNextOrder/);
  assert.match(cartPageSource, /setSaveDetailsForNextOrder\(e\.target\.checked\)/);
  assert.match(cartPageSource, /if \(user && saveDetailsForNextOrder\)/);

  assert.doesNotMatch(cartPageSource, /showSaveConfirm/);
  assert.doesNotMatch(cartPageSource, /handleConfirmSave/);
  assert.doesNotMatch(cartPageSource, /handleSkipSave/);
  assert.doesNotMatch(cartPageSource, /Save for next time\?/);
  assert.doesNotMatch(cartPageSource, /No, just order/);
  assert.doesNotMatch(cartPageSource, /Yes, Save & Order/);
});
