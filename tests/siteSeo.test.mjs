import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SITE_POLICY,
  buildOrganizationSchema,
  buildWebsiteSchema,
} from '../src/utils/siteSeo.js';

test('site policy records approved shipping, replacement, refund, and support facts', () => {
  assert.equal(SITE_POLICY.url, 'https://rosaryplanthouse.com/policies');
  assert.equal(SITE_POLICY.shipping.dispatchDays, 'Monday and Wednesday');
  assert.equal(SITE_POLICY.shipping.serviceArea, 'All over South India and major cities in North India');
  assert.deepEqual(SITE_POLICY.shipping.deliveryEtaFromDispatch, [
    { area: 'Bangalore', eta: '1-2 days from dispatch' },
    { area: 'Tamil Nadu', eta: '1-2 days from dispatch' },
    { area: 'South India', eta: '2-3 days from dispatch' },
    { area: 'Other serviceable major cities', eta: '4-5 days from dispatch' },
  ]);
  assert.equal(SITE_POLICY.damageSupport.proof, 'Video is preferred; photos are also accepted.');
  assert.match(SITE_POLICY.damageSupport.replacement, /next order/i);
  assert.match(SITE_POLICY.damageSupport.refund, /refund/i);
  assert.equal(SITE_POLICY.support.whatsAppHours, 'Every day, 9 AM to 9 PM');
});

test('organization schema includes merchant shipping and return policy details', () => {
  const schema = buildOrganizationSchema();

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'OnlineStore');
  assert.equal(schema['@id'], 'https://rosaryplanthouse.com/#organization');
  assert.equal(schema.name, 'Rosary Plant House');
  assert.equal(schema.url, 'https://rosaryplanthouse.com');
  assert.equal(schema.telephone, '+91 7904050237');
  assert.equal(schema.hasShippingService['@type'], 'ShippingService');
  assert.equal(schema.hasShippingService['@id'], 'https://rosaryplanthouse.com/policies#standard-shipping');
  assert.match(schema.hasShippingService.description, /Monday and Wednesday/);
  assert.match(schema.hasShippingService.description, /South India/);
  assert.match(schema.hasShippingService.description, /major cities in North India/);
  assert.deepEqual(schema.hasShippingService.shippingDestination, [
    { '@type': 'DefinedRegion', addressCountry: 'IN', addressRegion: 'South India' },
    { '@type': 'DefinedRegion', addressCountry: 'IN', name: 'Major cities in North India' },
  ]);
  assert.equal(schema.hasMerchantReturnPolicy['@type'], 'MerchantReturnPolicy');
  assert.equal(schema.hasMerchantReturnPolicy['@id'], 'https://rosaryplanthouse.com/policies#transit-damage-policy');
  assert.equal(schema.hasMerchantReturnPolicy.merchantReturnDays, 2);
  assert.match(schema.hasMerchantReturnPolicy.description, /next order/);
  assert.match(schema.hasMerchantReturnPolicy.description, /video/i);
  assert.match(schema.hasMerchantReturnPolicy.description, /photo/i);
  assert.match(schema.hasMerchantReturnPolicy.description, /refund/i);
  assert.equal(schema.contactPoint.availableLanguage, 'English');
});

test('website schema points to the organization publisher', () => {
  const schema = buildWebsiteSchema();

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'WebSite');
  assert.equal(schema.name, 'Rosary Plant House');
  assert.equal(schema.url, 'https://rosaryplanthouse.com');
  assert.equal(schema.publisher['@id'], 'https://rosaryplanthouse.com/#organization');
});
