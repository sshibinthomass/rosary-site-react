export const SITE_URL = 'https://rosaryplanthouse.com';
export const SITE_NAME = 'Rosary Plant House';

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

export const WEEK_DAYS = Object.freeze([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);
