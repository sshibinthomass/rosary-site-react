import { PRODUCT_SEO_SITE } from './productSeo.js';

const SITE_URL = PRODUCT_SEO_SITE.url;
const SITE_NAME = PRODUCT_SEO_SITE.name;

export const SITE_POLICY = Object.freeze({
  path: '/policies',
  url: `${SITE_URL}/policies`,
  shipping: {
    serviceArea: 'All over South India and major cities in North India',
    dispatchDays: 'Monday and Wednesday',
    dispatchTiming: 'Plants are dispatched after payment on the nearest Monday or Wednesday when payment is completed by the previous day.',
    packaging: 'Plants are sent bare-rooted and packed with tissue, cotton, and cocopeat depending on the plant.',
    courier: 'DTDC is the default courier. Speed Post or Professional Courier can be considered on request, with delay risk handled by the customer.',
    deliveryCharge: 'Delivery charges are extra and depend on the customer location.',
    deliveryEtaFromDispatch: [
      { area: 'Bangalore', eta: '1-2 days from dispatch' },
      { area: 'Tamil Nadu', eta: '1-2 days from dispatch' },
      { area: 'South India', eta: '2-3 days from dispatch' },
      { area: 'Other serviceable major cities', eta: '4-5 days from dispatch' },
    ],
  },
  payment: {
    methods: ['GPay', 'PayTM', 'PhonePe', 'Net banking'],
    cod: 'Cash on delivery is not available.',
  },
  damageSupport: {
    proof: 'Video is preferred; photos are also accepted.',
    replacement: 'Transit-damaged plants are preferably replaced along with the customer next order when reported on the delivery day or the following day.',
    refund: 'Replacement is preferred first, but a refund can be processed if the customer needs it.',
    exclusions: 'Damage after delivery because of customer care conditions is not covered. High transit risk plants are not replaceable.',
  },
  support: {
    channel: 'WhatsApp',
    phone: '+91 79040 50237',
    whatsAppUrl: 'https://wa.me/917904050237',
    whatsAppHours: 'Every day, 9 AM to 9 PM',
    email: 'rosaryplanthouse@gmail.com',
  },
});

const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

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
  const questions = [
    {
      name: 'Where does Rosary Plant House ship plants?',
      text: SITE_POLICY.shipping.serviceArea,
    },
    {
      name: 'When are plants dispatched?',
      text: SITE_POLICY.shipping.dispatchTiming,
    },
    {
      name: 'What if a plant is damaged in transit?',
      text: `${SITE_POLICY.damageSupport.replacement} ${SITE_POLICY.damageSupport.proof}`,
    },
    {
      name: 'Is cash on delivery available?',
      text: SITE_POLICY.payment.cod,
    },
  ];

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
