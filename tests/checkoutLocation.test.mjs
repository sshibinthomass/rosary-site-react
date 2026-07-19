import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeCheckoutPincode } from '../src/utils/checkoutLocation.js';

test('changing a pincode clears the previous district and state', () => {
  assert.deepEqual(
    normalizeCheckoutPincode({
      pincode: '643102',
      district: 'Nilgiris',
      state: 'Tamil Nadu',
    }, '000000'),
    {
      pincode: '000000',
      district: '',
      state: '',
    }
  );
});

test('pincode input keeps only the first six digits without affecting other checkout details', () => {
  assert.deepEqual(
    normalizeCheckoutPincode({
      name: 'Customer',
      phone: '',
      pincode: '',
      district: '',
      state: '',
    }, '64a31029'),
    {
      name: 'Customer',
      phone: '',
      pincode: '643102',
      district: '',
      state: '',
    }
  );
});
