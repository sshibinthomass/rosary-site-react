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

test('cart shows a persistent confirmation panel after opening WhatsApp', () => {
  assert.match(cartPageSource, /checkoutConfirmation/);
  assert.match(cartPageSource, /setCheckoutConfirmation\(\{/);
  assert.match(
    cartPageSource,
    /Your order request was opened in WhatsApp\. Please tap Send there to confirm\. No payment has been collected on this site\./
  );
  assert.match(cartPageSource, />\s*Continue shopping\s*</);
  assert.match(cartPageSource, />\s*Open WhatsApp again\s*</);
  assert.match(cartPageSource, />\s*View order\s*</);
  assert.match(cartPageSource, /openExternalUrl\(checkoutConfirmation\.whatsappUrl\)/);

  const confirmationPanelIndex = cartPageSource.indexOf('checkoutConfirmationPanel');
  const emptyCartIndex = cartPageSource.indexOf('Your cart is empty');
  assert.ok(confirmationPanelIndex !== -1, 'CartPage should define a reusable confirmation panel');
  assert.ok(
    confirmationPanelIndex < emptyCartIndex,
    'confirmation panel should be prepared before the empty-cart return so saved orders do not show only an empty cart'
  );
});

test('cart keeps checkout open with a retryable error when order verification fails', () => {
  assert.match(
    cartPageSource,
    /Order was not confirmed\. Your cart is safe—please try again\./
  );
  assert.match(
    cartPageSource,
    /catch \(err\) \{[\s\S]*?setShowCheckout\(true\);[\s\S]*?Order was not confirmed/
  );
});

test('cart clears stale location through the shared pincode normalizer', () => {
  assert.match(cartPageSource, /normalizeCheckoutPincode/);
  assert.match(
    cartPageSource,
    /setCheckoutInfo\(prev => normalizeCheckoutPincode\(prev, value\)\)/
  );
});

test('cart continues to allow orders with optional delivery details', () => {
  assert.doesNotMatch(cartPageSource, /required=/);
  assert.doesNotMatch(cartPageSource, /isCheckoutInfoValid/);
  assert.match(cartPageSource, /disabled=\{isSaving\}/);
});

test('cart treats WhatsApp launch failure as a saved order with retry', () => {
  assert.match(cartPageSource, /whatsappOpened/);
  assert.match(cartPageSource, /Your order is safely saved/);
  assert.match(cartPageSource, /WhatsApp could not open/);
  assert.match(cartPageSource, /Open WhatsApp again/);
  assert.match(cartPageSource, /if \(checkoutResult\?\.savedToFirestore\)/);
  assert.match(
    cartPageSource,
    /whatsappOpened:\s*checkoutResult\?\.whatsappOpened !== false/
  );
});
