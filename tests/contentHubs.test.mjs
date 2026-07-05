import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  CONTENT_HUBS,
  GUIDE_IMAGE_ASSETS,
  getContentHubBySlug,
  getContentHubImage,
  getContentHubImageAlt,
  getContentHubPath,
  getContentHubProducts,
  getProductRelatedSeoLinks,
} from '../src/utils/contentHubs.js';

const rootDir = path.resolve('.');

test('content hubs cover priority SEO and AI-answer themes', () => {
  const slugs = CONTENT_HUBS.map((hub) => hub.slug);

  assert.ok(CONTENT_HUBS.length >= 14, 'high-intent static content hubs should exist');
  assert.equal(new Set(slugs).size, slugs.length, 'content hub slugs should be unique');
  assert.ok(slugs.includes('succulents-in-india'));
  assert.ok(slugs.includes('low-water-balcony-plants'));
  assert.ok(slugs.includes('monsoon-succulent-care'));
  assert.ok(slugs.includes('buy-succulents-online-india'));
  assert.ok(slugs.includes('plant-delivery-bangalore'));
  assert.ok(slugs.includes('plant-delivery-chennai'));
  assert.ok(slugs.includes('low-maintenance-balcony-plants'));
  assert.ok(slugs.includes('cactus-plants-online-india'));
  assert.ok(slugs.includes('ceramic-pot-succulents'));
  assert.ok(slugs.includes('hanging-plants-balcony'));
  assert.ok(slugs.includes('coonoor-plant-nursery'));
});

test('each content hub has crawlable answer sections, FAQs, and canonical path data', () => {
  for (const hub of CONTENT_HUBS) {
    assert.match(hub.slug, /^[a-z0-9-]+$/);
    assert.ok(hub.title.includes('Rosary Plant House') === false, `${hub.slug} title should not duplicate the site name`);
    assert.ok(hub.metaDescription.length >= 120, `${hub.slug} description is too thin`);
    assert.ok(hub.metaDescription.length <= 165, `${hub.slug} description is too long`);
    assert.ok(hub.intro.length >= 140, `${hub.slug} intro is too thin`);
    assert.ok(Array.isArray(hub.sections) && hub.sections.length >= 3, `${hub.slug} needs useful sections`);
    assert.ok(Array.isArray(hub.faqs) && hub.faqs.length >= 3, `${hub.slug} needs FAQs for AEO`);
    assert.equal(getContentHubPath(hub), `/guides/${hub.slug}`);
  }
});

test('each content hub has a crawlable guide image with useful alt text', () => {
  assert.ok(Object.keys(GUIDE_IMAGE_ASSETS).length >= 5, 'guide image asset set should cover the major guide themes');

  const images = CONTENT_HUBS.map(getContentHubImage);
  assert.ok(new Set(images).size >= 5, 'content hubs should not all share the same generic image');

  for (const hub of CONTENT_HUBS) {
    const imagePath = getContentHubImage(hub);
    const imageAlt = getContentHubImageAlt(hub);

    assert.match(imagePath, /^\/guides\/guide-[a-z0-9-]+\.jpg$/, `${hub.slug} image should use a descriptive guide asset path`);
    assert.equal(fs.existsSync(path.join(rootDir, 'public', imagePath.replace(/^\//, ''))), true, `${imagePath} should exist`);
    assert.ok(imageAlt.length >= 45, `${hub.slug} image alt text should be descriptive`);
    assert.match(imageAlt, /Rosary Plant House|succulent|cactus|plant|nursery/i);
  }
});

test('content hub product matching returns relevant public products first', () => {
  const hub = getContentHubBySlug('low-water-balcony-plants');
  const products = [
    {
      id: '1',
      title: 'Sempervivum Tectorum',
      category: 'Succulent',
      watering: 'Low',
      sunlight: 'Moderate',
      transit: 'Low',
      available: true,
      seoStatus: 'published',
      identityVerified: true,
    },
    {
      id: '2',
      title: 'Fern',
      category: 'Indoor',
      watering: 'High',
      sunlight: 'Low',
      transit: 'Moderate',
      available: true,
      seoStatus: 'published',
      identityVerified: true,
    },
  ];

  const matches = getContentHubProducts(hub, products);
  assert.equal(matches[0].id, '1');
  assert.equal(matches.some((product) => product.id === '2'), false);
});

test('product related SEO links resolve known plant categories, care guides, and problem guides', () => {
  const links = getProductRelatedSeoLinks({
    seo: {
      relatedPlants: ['echeveria', 'haworthia', 'jade-plant', 'unknown-family'],
      relatedCareGuides: ['succulent-care-guide', 'monsoon-succulent-care'],
      relatedProblemGuides: ['succulent-root-rot', 'succulent-sunburn'],
    },
  });

  assert.deepEqual(links.plants, [
    { label: 'Echeveria plants', path: '/category/Echeveria' },
    { label: 'Haworthia plants', path: '/category/Haworthia' },
    { label: 'Jade plants', path: '/category/Jade' },
  ]);
  assert.deepEqual(links.careGuides, [
    { label: 'Succulents in India: Care and Buying Guide', path: '/guides/succulents-in-india' },
    { label: 'Monsoon Succulent Care in India', path: '/guides/monsoon-succulent-care' },
  ]);
  assert.deepEqual(links.problemGuides, [
    { label: 'Root Rot in Succulents: Signs and Recovery', path: '/guides/root-rot-succulent-care' },
    { label: 'Indoor Succulent Care for Indian Apartments', path: '/guides/indoor-succulent-care' },
  ]);
});
