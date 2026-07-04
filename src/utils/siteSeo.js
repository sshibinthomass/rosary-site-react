import {
  SITE_NAME,
  SITE_POLICY,
  SITE_URL,
  WEEK_DAYS,
} from './sitePolicy.js';

export {
  SITE_NAME,
  SITE_POLICY,
  SITE_URL,
  WEEK_DAYS,
} from './sitePolicy.js';

export function buildCustomerFaqSections() {
  return [
    {
      category: 'Shipping and delivery',
      items: [
        {
          q: 'Where does Rosary Plant House ship plants?',
          a: SITE_POLICY.shipping.serviceArea,
        },
        {
          q: 'When will my plants be dispatched?',
          a: SITE_POLICY.shipping.dispatchTiming,
        },
        {
          q: 'How long does delivery take after dispatch?',
          a: SITE_POLICY.shipping.deliveryEtaFromDispatch
            .map((item) => `${item.area}: ${item.eta}`)
            .join('; '),
        },
        {
          q: 'How are plants packed for shipping?',
          a: SITE_POLICY.shipping.packaging,
        },
      ],
    },
    {
      category: 'Damage, replacement and refund',
      items: [
        {
          q: 'What if a plant is damaged in transit?',
          a: `${SITE_POLICY.damageSupport.replacement} ${SITE_POLICY.damageSupport.proof}`,
        },
        {
          q: 'Can I get a refund instead of replacement?',
          a: SITE_POLICY.damageSupport.refund,
        },
        {
          q: 'Is damage after delivery covered?',
          a: SITE_POLICY.damageSupport.exclusions,
        },
      ],
    },
    {
      category: 'Payment and support',
      items: [
        {
          q: 'What payment methods are accepted?',
          a: SITE_POLICY.payment.methods.join(', '),
        },
        {
          q: 'Is cash on delivery available?',
          a: SITE_POLICY.payment.cod,
        },
        {
          q: 'When is WhatsApp support available?',
          a: `${SITE_POLICY.support.whatsAppHours} on ${SITE_POLICY.support.phone}.`,
        },
      ],
    },
    {
      category: 'Ordering and trust',
      items: [
        {
          q: 'What is the recommended minimum order?',
          a: 'A minimum of 5 plants is recommended because delivery charges apply by location.',
        },
        {
          q: 'Where can I check customer feedback?',
          a: 'You can review Rosary Plant House feedback on Instagram, Facebook, Google reviews, and the customer reviews page.',
        },
        {
          q: 'Where can I find plant care guidance?',
          a: 'Each plant page includes care, watering, light, placement, and common problem guidance for that plant.',
        },
      ],
    },
  ];
}

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    telephone: '+91 7904050237',
    email: SITE_POLICY.support.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Samayapuram, Alwarpet',
      addressLocality: 'Coonoor',
      addressRegion: 'Tamil Nadu',
      addressCountry: 'IN',
    },
    sameAs: [
      'https://instagram.com/rosary_plant_house',
      'https://facebook.com/rosaryplanthouse',
      'https://youtube.com/channel/UCUYHYgkyhoVXy5_h8a5ly6w',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      telephone: '+91 7904050237',
      availableLanguage: 'English',
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: WEEK_DAYS,
        opens: '09:00',
        closes: '21:00',
      },
    },
    hasShippingService: {
      '@type': 'ShippingService',
      '@id': `${SITE_POLICY.url}#standard-shipping`,
      name: 'Standard live plant shipping',
      description: [
        `Dispatch days: ${SITE_POLICY.shipping.dispatchDays}.`,
        SITE_POLICY.shipping.dispatchTiming,
        `Service area: ${SITE_POLICY.shipping.serviceArea}.`,
        SITE_POLICY.shipping.courier,
      ].join(' '),
      shippingDestination: [
        { '@type': 'DefinedRegion', addressCountry: 'IN', addressRegion: 'South India' },
        { '@type': 'DefinedRegion', addressCountry: 'IN', name: 'Major cities in North India' },
      ],
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      '@id': `${SITE_POLICY.url}#transit-damage-policy`,
      name: 'Transit damage replacement and refund policy',
      applicableCountry: 'IN',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 2,
      description: [
        SITE_POLICY.damageSupport.replacement,
        SITE_POLICY.damageSupport.proof,
        SITE_POLICY.damageSupport.refund,
        SITE_POLICY.damageSupport.exclusions,
      ].join(' '),
    },
  };
}

export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
  };
}

export function buildPolicyFaqSchema() {
  const questions = buildCustomerFaqSections()
    .flatMap((section) => section.items)
    .map((item) => ({
      name: item.q,
      text: item.a,
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((question) => ({
      '@type': 'Question',
      name: question.name,
      acceptedAnswer: {
        '@type': 'Answer',
        text: question.text,
      },
    })),
  };
}
