import {
  PRODUCT_SEO_SITE,
  getAbsoluteImageUrl,
  getProductCanonicalUrl,
  getProductDisplayName,
  isSeoIndexable,
} from './productSeo.js';
import { CATEGORIES } from '../config/constants.js';

export const GUIDE_IMAGE_ASSETS = Object.freeze({
  group: '/guides/guide-succulent-group-nursery.jpg',
  ceramic: '/guides/guide-ceramic-pot-succulents.jpg',
  hanging: '/guides/guide-hanging-balcony-plants.jpg',
  flowering: '/guides/guide-flowering-cactus-plants.jpg',
  delivery: '/guides/guide-plant-delivery-packing.jpg',
});

export const CONTENT_HUBS = Object.freeze([
  {
    slug: 'succulents-in-india',
    title: 'Succulents in India: Care and Buying Guide',
    h1: 'Succulents in India: care, buying and delivery guide',
    metaDescription: 'Learn how to choose and care for succulents in India, with light, watering, soil, delivery and plant recommendations from Rosary Plant House.',
    intro: 'Succulents can grow very well in Indian homes when the basics are right: bright light, fast drainage, careful watering and protection from long wet spells. Use this guide to choose beginner-friendly succulents, understand seasonal care, and find plants that suit balconies, windowsills and warm Indian weather.',
    answer: 'For most Indian homes, choose compact succulents such as Echeveria, Haworthia, Sedum, Crassula, Jade, Aloe and hardy mixed succulents. Keep them in bright filtered light, use a gritty soil mix, water only after the potting mix dries, and reduce watering during humid or rainy weather.',
    image: GUIDE_IMAGE_ASSETS.group,
    imageAlt: 'Succulent nursery collection for Rosary Plant House care guides',
    productFilters: {
      categories: ['Succulent', 'Echeveria', 'Sedum', 'Haworthia', 'Crassula', 'Jade', 'Aloe'],
      keywords: ['succulent', 'echeveria', 'haworthia', 'sedum', 'crassula', 'jade', 'aloe', 'sempervivum'],
      watering: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'Best succulents for Indian homes',
        body: [
          'Start with plants that tolerate bright windows, covered balconies and short dry spells. Echeveria, Haworthia, Sedum, Crassula, Jade and Aloe are reliable choices because their leaves store water and they do not need daily attention.',
          'For beginners, avoid placing new succulents in harsh afternoon sun immediately after delivery. Give them a few days in bright shade, then move them gradually toward stronger light if the leaves stay firm and compact.',
        ],
        bullets: [
          'Choose compact rosette or clumping succulents for small spaces.',
          'Use covered balconies for better airflow and rain protection.',
          'Pick low to moderate watering plants if you travel often.',
        ],
      },
      {
        heading: 'Light, watering and soil basics',
        body: [
          'Most succulents need more light than typical indoor foliage plants. A bright east window, south-facing balcony with shade, or a spot with several hours of indirect light works better than a dark table corner.',
          'Water deeply, then wait until the mix dries before watering again. A gritty cactus or succulent mix with drainage holes is safer than dense garden soil, especially in humid places and during monsoon.',
        ],
      },
      {
        heading: 'Buying succulents online in India',
        body: [
          'When buying online, look for clear plant identity, real photos, packing support and practical care instructions. Bare-rooted or semi-bare-rooted shipping can help many succulents travel safely because wet soil during transit increases rot risk.',
          'After delivery, unpack gently, keep the plant bright but shaded for a short recovery period, and water only when the roots and potting mix are ready.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Which succulents are best for beginners in India?',
        answer: 'Haworthia, Sedum, Jade, Crassula, Aloe and many Echeveria types are good beginner choices when they get bright light, drainage and controlled watering.',
      },
      {
        question: 'Can succulents survive indoors in India?',
        answer: 'Yes, but only near a bright window or balcony door. If the plant stretches, loses color or stays wet for too long, move it to brighter light and improve airflow.',
      },
      {
        question: 'How often should succulents be watered in India?',
        answer: 'Water after the potting mix dries. In warm dry weather this may be weekly, while in monsoon or humid rooms it can be much less often.',
      },
    ],
    relatedHubSlugs: ['low-water-balcony-plants', 'monsoon-succulent-care', 'indoor-succulent-care'],
  },
  {
    slug: 'low-water-balcony-plants',
    title: 'Low Water Balcony Plants for Indian Homes',
    h1: 'Low water balcony plants for Indian homes',
    metaDescription: 'Find low water balcony plants for Indian homes, including succulents, cacti and hardy picks that handle bright light with simple watering.',
    intro: 'Low water balcony plants are ideal when you want a green space without daily watering. For Indian balconies, the safest choices are usually succulents, cacti, jade plants, crassula, aloe, sedum and other drought-tolerant plants that prefer bright light and quick drainage.',
    answer: 'The best low water balcony plants are succulents, cactus, Jade, Crassula, Aloe, Sedum, Haworthia and Sansevieria. Place them where they get bright light, use pots with drainage holes, and water only when the soil is dry.',
    image: GUIDE_IMAGE_ASSETS.hanging,
    imageAlt: 'Hanging and low water balcony plants in a Rosary Plant House style nursery',
    productFilters: {
      categories: ['Succulent', 'Cactus', 'Jade', 'Crassula', 'Aloe', 'Sedum', 'Haworthia', 'Sansevieria'],
      keywords: ['low water', 'succulent', 'cactus', 'jade', 'crassula', 'aloe', 'sedum', 'haworthia', 'sansevieria'],
      watering: ['Low'],
      transit: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'What makes a balcony plant low maintenance',
        body: [
          'A good low water balcony plant stores water in its leaves, stems or roots and does not collapse if you miss a day. It should also handle airflow, bright light and warm weather without needing constant misting.',
          'The pot matters as much as the plant. Drainage holes, a light soil mix and a spot protected from direct rain make low water care much easier.',
        ],
      },
      {
        heading: 'Best plant types for bright balconies',
        body: [
          'Succulents and cacti are the first choice for bright balconies. Jade, Crassula, Aloe and Sedum are also dependable because they prefer drying between watering sessions.',
        ],
        bullets: [
          'Use cacti for sunny, dry corners.',
          'Use Haworthia for bright shade or gentler morning light.',
          'Use Jade and Crassula where airflow is good and watering can stay light.',
        ],
      },
      {
        heading: 'Watering routine for busy homes',
        body: [
          'Check the soil before watering instead of following a fixed daily schedule. If the top and middle of the mix still feel damp, wait. Most low water balcony plants prefer one full watering followed by a dry gap.',
          'During monsoon, move pots away from rain splash and reduce watering sharply. Wet roots are a bigger risk than underwatering for most succulents and cacti.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Which balcony plants need the least water?',
        answer: 'Cactus, Jade, Crassula, Aloe, Sedum, Haworthia and many compact succulents need less water than most foliage plants when grown in bright light.',
      },
      {
        question: 'Can low water plants grow on a covered balcony?',
        answer: 'Yes. A covered balcony is often better because it gives light and airflow while protecting the pot from heavy rain.',
      },
      {
        question: 'Should balcony succulents be watered every day?',
        answer: 'No. Daily watering is usually harmful. Water only after the potting mix dries, and reduce watering during humid or rainy weather.',
      },
    ],
    relatedHubSlugs: ['succulents-in-india', 'cactus-care-india', 'monsoon-succulent-care'],
  },
  {
    slug: 'monsoon-succulent-care',
    title: 'Monsoon Succulent Care in India',
    h1: 'Monsoon succulent care in India',
    metaDescription: 'Monsoon succulent care guide for India: watering, drainage, airflow, fungal checks and recovery steps to keep succulents healthy in rainy weather.',
    intro: 'Monsoon is the season when many succulents struggle in India. The problem is usually not rain alone; it is the combination of wet soil, low airflow, lower light and high humidity. A few simple changes can prevent root rot, fungus and leaf drop.',
    answer: 'During monsoon, keep succulents under cover, increase airflow, water less often, remove dead leaves, and use a gritty mix that dries quickly. Do not let pots sit in rainwater or trays.',
    image: GUIDE_IMAGE_ASSETS.group,
    imageAlt: 'Airy succulent nursery bench for Rosary Plant House monsoon care guidance',
    productFilters: {
      categories: ['Succulent', 'Cactus', 'Echeveria', 'Sedum', 'Haworthia', 'Crassula', 'Jade', 'Aloe'],
      keywords: ['succulent', 'cactus', 'echeveria', 'haworthia', 'sedum', 'crassula', 'jade', 'aloe'],
      watering: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
      transit: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'Reduce water before trouble starts',
        body: [
          'In monsoon, the potting mix dries slowly even if the surface looks dry. Wait longer between watering sessions, especially for thick-leaved succulents and plants kept indoors.',
          'If rain reaches the pot, treat that as watering. Do not water again until the mix has dried well and the plant looks ready.',
        ],
      },
      {
        heading: 'Protect roots with airflow and drainage',
        body: [
          'Move succulents to a covered, bright and airy place. Avoid closed corners where humidity stays high. Pots with drainage holes are essential because trapped water can damage roots quickly.',
          'Remove fallen leaves from the soil surface. Dead leaves hold moisture and can invite fungus or pests during damp weather.',
        ],
      },
      {
        heading: 'Early signs of monsoon stress',
        body: [
          'Soft stems, transparent leaves, black spots, yellow lower leaves and a sour smell from the soil can point to root or stem rot. Act early by stopping water, improving airflow and checking the roots if the plant continues to soften.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Should succulents be kept in rain during monsoon?',
        answer: 'Most succulents should be kept under cover during heavy or repeated rain. A little rain may be fine for hardy plants, but wet soil for many days can cause rot.',
      },
      {
        question: 'How do I stop succulent root rot in monsoon?',
        answer: 'Use a fast-draining mix, pots with holes, bright cover, good airflow and longer dry gaps between watering. Remove dead leaves and avoid water trays.',
      },
      {
        question: 'Can a rotting succulent recover?',
        answer: 'Sometimes. Remove damaged parts, dry the healthy section, repot into a dry gritty mix and restart watering slowly only after recovery begins.',
      },
    ],
    relatedHubSlugs: ['root-rot-succulent-care', 'succulents-in-india', 'low-water-balcony-plants'],
  },
  {
    slug: 'indoor-succulent-care',
    title: 'Indoor Succulent Care for Indian Apartments',
    h1: 'Indoor succulent care for Indian apartments',
    metaDescription: 'Indoor succulent care for Indian apartments, covering window light, watering gaps, airflow, soil mix and signs that a plant needs more sun.',
    intro: 'Indoor succulent care is mostly about light discipline. Succulents can decorate apartments beautifully, but they still need a bright window, dry gaps between watering, and enough airflow to prevent weak growth and rot.',
    answer: 'To grow succulents indoors, keep them next to the brightest available window, avoid dark shelves, use a gritty soil mix, water only after the mix dries, and rotate the pot so growth stays even.',
    image: GUIDE_IMAGE_ASSETS.ceramic,
    imageAlt: 'Ceramic pot succulents for Rosary Plant House indoor plant care',
    productFilters: {
      categories: ['Succulent', 'Haworthia', 'Aloe', 'Sansevieria', 'Peperomia', 'Jade', 'Crassula'],
      keywords: ['indoor', 'haworthia', 'aloe', 'sansevieria', 'peperomia', 'jade', 'crassula', 'succulent'],
      booleans: ['indoor'],
      watering: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
      sunlight: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'Choose the brightest indoor spot',
        body: [
          'A bright window is better than a center table. Morning light, filtered balcony light or a very bright windowsill helps succulents keep compact growth and better color.',
          'If the plant stretches toward the light, fades or opens up, it is asking for more light. Move it closer to a window gradually.',
        ],
      },
      {
        heading: 'Water less than you expect',
        body: [
          'Indoor pots dry slower than balcony pots. Check the mix before watering and keep the plant in a container with a drainage hole whenever possible.',
          'Avoid misting succulents indoors. Wet leaves and still air can cause marks, fungus and rot.',
        ],
      },
      {
        heading: 'Best indoor-friendly succulents',
        body: [
          'Haworthia, some Aloe, compact Jade, Crassula and Sansevieria are better indoor candidates than sun-hungry rosette succulents. Even these plants need bright light to stay healthy long term.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can succulents grow without sunlight indoors?',
        answer: 'They need bright light. A dark room without window light is not suitable for long-term succulent growth.',
      },
      {
        question: 'Why is my indoor succulent stretching?',
        answer: 'Stretching usually means low light. Move the plant to a brighter window or covered balcony gradually.',
      },
      {
        question: 'Should indoor succulents be misted?',
        answer: 'No. Misting is not needed for most succulents and can create moisture problems indoors.',
      },
    ],
    relatedHubSlugs: ['succulents-in-india', 'low-water-balcony-plants', 'root-rot-succulent-care'],
  },
  {
    slug: 'cactus-care-india',
    title: 'Cactus Care in India for Beginners',
    h1: 'Cactus care in India for beginners',
    metaDescription: 'Cactus care in India explained with light, watering, soil, pot drainage, summer heat, monsoon protection and beginner-friendly cactus picks.',
    intro: 'Cactus plants are among the easiest choices for bright Indian balconies and sunny windows, but they still fail when kept wet or dark. The right cactus care routine is simple: strong light, gritty soil, drainage and patient watering.',
    answer: 'Give cactus plants bright light, a gritty cactus mix, a pot with drainage holes and deep but infrequent watering. Protect them from repeated monsoon rain and avoid keeping them in dark indoor corners.',
    image: GUIDE_IMAGE_ASSETS.flowering,
    imageAlt: 'Flowering cactus plants for Rosary Plant House cactus care guidance',
    productFilters: {
      categories: ['Cactus'],
      keywords: ['cactus', 'cacti', 'mammillaria', 'gymnocalycium', 'opuntia', 'cereus'],
      watering: ['Low'],
      sunlight: ['High', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'Light needs for cactus plants',
        body: [
          'Most cactus plants prefer strong light. Morning sun and bright balconies are usually better than shaded indoor shelves. Move newly delivered cactus plants into stronger light gradually so they do not scorch.',
        ],
      },
      {
        heading: 'Watering cactus in Indian weather',
        body: [
          'Water thoroughly, then wait until the soil dries completely. In summer, some cactus plants may need more frequent watering than in monsoon, but they should never sit in wet soil.',
          'During monsoon, protect cactus pots from repeated rain and skip watering if humidity is high or the mix is still damp.',
        ],
      },
      {
        heading: 'Soil and pot choice',
        body: [
          'Use a gritty cactus mix with mineral material so water moves through quickly. A drainage hole is essential. Decorative pots without drainage are risky unless used only as outer covers.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How often should cactus be watered in India?',
        answer: 'Water after the soil dries fully. The gap depends on light, pot size and season, but daily watering is not suitable.',
      },
      {
        question: 'Can cactus grow indoors?',
        answer: 'Cactus can grow near a very bright sunny window, but most types do better on bright balconies or windowsills than in dark rooms.',
      },
      {
        question: 'Why is my cactus becoming soft?',
        answer: 'A soft cactus often means rot from excess moisture. Stop watering, check drainage and inspect the roots or base.',
      },
    ],
    relatedHubSlugs: ['low-water-balcony-plants', 'monsoon-succulent-care', 'root-rot-succulent-care'],
  },
  {
    slug: 'root-rot-succulent-care',
    title: 'Root Rot in Succulents: Signs and Recovery',
    h1: 'Root rot in succulents: signs and recovery',
    metaDescription: 'Root rot in succulents: spot early symptoms, stop overwatering, repot safely and prevent wet roots in Indian weather and balcony conditions.',
    intro: 'Root rot is one of the most common reasons succulents fail. It often starts quietly below the soil when the pot stays wet for too long. Early action can save many plants, especially if the stem is still firm and there are healthy roots or leaves left.',
    answer: 'To handle succulent root rot, stop watering, remove the plant from wet soil, cut away black or mushy roots, let healthy sections dry, and repot into a fresh gritty mix. Restart watering slowly after the plant stabilizes.',
    image: GUIDE_IMAGE_ASSETS.delivery,
    imageAlt: 'Succulent care and packing table for Rosary Plant House root rot recovery support',
    productFilters: {
      categories: ['Succulent', 'Cactus', 'Echeveria', 'Sedum', 'Haworthia', 'Crassula', 'Jade', 'Aloe'],
      keywords: ['succulent', 'cactus', 'echeveria', 'haworthia', 'sedum', 'crassula', 'jade', 'aloe'],
      watering: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'Signs of root rot',
        body: [
          'Watch for yellow lower leaves, soft stems, blackened roots, transparent leaves, leaf drop and soil that smells sour. A plant can look thirsty and rotten at the same time because damaged roots cannot absorb water.',
        ],
      },
      {
        heading: 'Recovery steps',
        body: [
          'Remove the plant from wet soil and inspect the roots. Trim black or mushy roots with clean tools. Let the healthy base dry in shade, then repot into a dry gritty mix with excellent drainage.',
          'Do not water immediately after repotting unless the plant type and root condition clearly need it. Restart with small watering only after the plant shows signs of stability.',
        ],
      },
      {
        heading: 'Prevention in Indian conditions',
        body: [
          'Root rot prevention is mostly about dry gaps, drainage and airflow. Use pots with holes, avoid dense soil, reduce watering during monsoon, and keep succulents away from repeated rain splash.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can succulent root rot be reversed?',
        answer: 'Early root rot can often be stopped by trimming damaged roots, drying the plant and repotting into a dry gritty mix. Advanced stem rot is harder to save.',
      },
      {
        question: 'Should I water after repotting a rotting succulent?',
        answer: 'Usually wait. Let cuts dry and let the plant stabilize before watering lightly.',
      },
      {
        question: 'Why do succulents rot in monsoon?',
        answer: 'High humidity, slow-drying soil, low airflow and repeated rain can keep roots wet for too long, which encourages rot.',
      },
    ],
    relatedHubSlugs: ['monsoon-succulent-care', 'succulents-in-india', 'indoor-succulent-care'],
  },
  {
    slug: 'buy-succulents-online-india',
    title: 'Buy Succulents Online in India',
    h1: 'Buy succulents online in India with safe plant delivery',
    metaDescription: 'Buy succulents online in India with care tips, packing guidance, delivery support and beginner-friendly picks from Rosary Plant House.',
    intro: 'Buying succulents online in India works best when the plant page clearly explains identity, light needs, watering, packing and after-delivery care. Rosary Plant House focuses on compact succulents, cactus plants and balcony-friendly varieties that can travel safely when ordered with realistic care expectations.',
    answer: 'To buy succulents online in India, choose verified plant pages with clear photos, care notes, price, availability, packing details and support. After delivery, keep the plant bright but shaded for recovery and water only after the mix is dry.',
    image: GUIDE_IMAGE_ASSETS.group,
    imageAlt: 'Mixed succulent collection for Rosary Plant House online plant buying guide',
    productFilters: {
      categories: ['Succulent', 'Echeveria', 'Sedum', 'Haworthia', 'Crassula', 'Jade', 'Aloe', 'Cactus'],
      keywords: ['buy succulent', 'succulent', 'echeveria', 'haworthia', 'sedum', 'crassula', 'jade', 'aloe', 'cactus'],
      watering: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'What to check before ordering',
        body: [
          'Look for plant identity, current availability, price, care guidance and a real product photo. Succulents vary in light and water tolerance, so a clear plant page helps you choose for a balcony, windowsill or bright indoor spot.',
          'Also check the shipping and support policy. Live plants need careful packing, dispatch timing and a simple way to report transit damage quickly.',
        ],
        bullets: [
          'Choose low water succulents if you travel often.',
          'Choose Haworthia or Aloe for bright shade and gentler light.',
          'Choose Echeveria, Sedum and cactus for brighter balcony conditions.',
        ],
      },
      {
        heading: 'After-delivery care',
        body: [
          'Unpack gently and keep the plant in bright shade for a short recovery period. Do not place a newly delivered succulent in harsh afternoon sun immediately.',
          'Avoid watering on a fixed schedule. Check the roots and potting mix first, then water only when the plant is ready and the mix can dry again.',
        ],
      },
      {
        heading: 'Best beginner choices',
        body: [
          'Jade, Crassula, Haworthia, Aloe, Sedum and many compact mixed succulents are good starting points for Indian homes. They reward bright light, drainage and patience more than daily attention.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is it safe to buy succulents online in India?',
        answer: 'Yes, when plants are packed carefully, dispatched on suitable days and supported with clear after-delivery care instructions.',
      },
      {
        question: 'Do succulents need water immediately after delivery?',
        answer: 'Usually no. Let the plant recover in bright shade and water only after checking that the roots and mix are ready.',
      },
      {
        question: 'Which succulents are easiest to buy online?',
        answer: 'Jade, Crassula, Haworthia, Aloe, Sedum and compact hardy succulents are usually easier choices for beginners.',
      },
    ],
    relatedHubSlugs: ['succulents-in-india', 'low-water-balcony-plants', 'monsoon-succulent-care'],
  },
  {
    slug: 'plant-delivery-bangalore',
    title: 'Plant Delivery in Bangalore',
    h1: 'Plant delivery in Bangalore from Rosary Plant House',
    metaDescription: 'Plant delivery in Bangalore with dispatch details, live plant packing, ETA from dispatch, payment options and support from Rosary Plant House.',
    intro: 'Bangalore plant delivery is one of the smoother routes for Rosary Plant House because the expected delivery time is usually short after dispatch. The most important choices are selecting plants that suit balcony light, avoiding overwatering after delivery and reporting transit issues quickly if they occur.',
    answer: 'For Bangalore, Rosary Plant House lists the delivery ETA as 1-2 days from dispatch. Plants are dispatched after payment on the nearest Monday or Wednesday when payment is completed by the previous day.',
    image: GUIDE_IMAGE_ASSETS.delivery,
    imageAlt: 'Live plant packing setup for Rosary Plant House Bangalore delivery guide',
    productFilters: {
      categories: ['Succulent', 'Cactus', 'Jade', 'Crassula', 'Aloe', 'Haworthia', 'Indoor', 'Hanging'],
      keywords: ['bangalore', 'balcony', 'succulent', 'cactus', 'jade', 'aloe', 'indoor', 'hanging'],
      watering: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
      transit: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'Delivery ETA and dispatch',
        body: [
          'The Bangalore ETA is 1-2 days from dispatch. Dispatch happens on Monday and Wednesday after payment, when payment is completed by the previous day.',
          'Because these are live plants, dispatch timing matters. The goal is to avoid unnecessary transit delays and keep plants packed for the shortest practical period.',
        ],
      },
      {
        heading: 'Best plants for Bangalore balconies',
        body: [
          'Covered Bangalore balconies often suit succulents, cactus, Jade, Crassula, Aloe, Haworthia and hanging plants when there is bright light and airflow.',
          'If your balcony receives harsh direct afternoon sun, introduce newly delivered plants gradually instead of moving them straight into the hottest spot.',
        ],
      },
      {
        heading: 'Support after delivery',
        body: [
          'If transit damage happens, video is preferred and photos are also accepted. Damage should be reported on delivery day or the following day so support can be handled quickly.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How long does plant delivery to Bangalore take?',
        answer: 'The expected ETA is 1-2 days from dispatch.',
      },
      {
        question: 'Is cash on delivery available for Bangalore orders?',
        answer: 'No. Cash on delivery is not available; supported payment methods include GPay, PayTM, PhonePe and net banking.',
      },
      {
        question: 'Which plants are good for Bangalore balconies?',
        answer: 'Succulents, cactus plants, Jade, Crassula, Aloe, Haworthia and hanging plants can work well in bright covered balconies.',
      },
    ],
    relatedHubSlugs: ['low-water-balcony-plants', 'buy-succulents-online-india', 'hanging-plants-balcony'],
  },
  {
    slug: 'plant-delivery-chennai',
    title: 'Plant Delivery in Chennai',
    h1: 'Plant delivery in Chennai and Tamil Nadu',
    metaDescription: 'Plant delivery in Chennai with Tamil Nadu ETA, live plant packing, dispatch days, payment options and care tips for humid weather.',
    intro: 'Chennai plant delivery needs good packing and careful after-delivery watering because the city can be hot and humid. Succulents, cactus plants and balcony plants can still do well when they receive bright light, airflow and a soil mix that does not stay wet.',
    answer: 'For Chennai and Tamil Nadu, Rosary Plant House lists the delivery ETA as 1-2 days from dispatch. Keep new plants in bright shade first, then move them gradually to their final balcony or window spot.',
    image: GUIDE_IMAGE_ASSETS.delivery,
    imageAlt: 'Packed succulents and nursery supplies for Rosary Plant House Chennai delivery guide',
    productFilters: {
      categories: ['Succulent', 'Cactus', 'Aloe', 'Jade', 'Crassula', 'Haworthia', 'Indoor', 'Hanging'],
      keywords: ['chennai', 'tamil nadu', 'humidity', 'succulent', 'cactus', 'aloe', 'jade', 'balcony'],
      watering: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'Tamil Nadu delivery timing',
        body: [
          'The Tamil Nadu ETA is 1-2 days from dispatch. Orders are dispatched on Monday and Wednesday after payment when payment is completed by the previous day.',
          'Shorter transit helps, but live plants still need a calm recovery period after arrival.',
        ],
      },
      {
        heading: 'Care in Chennai humidity',
        body: [
          'Humidity slows drying, so avoid daily watering. Use drainage holes, bright light and airflow so succulent and cactus roots do not stay wet.',
          'During rainy spells, keep plants away from direct rain splash and reduce watering until the potting mix dries properly.',
        ],
      },
      {
        heading: 'Good Chennai plant choices',
        body: [
          'Aloe, Jade, Crassula, Haworthia, cactus and hardy succulents are practical choices for bright balconies. Indoor plants need a bright window or balcony door rather than a dark corner.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How long does plant delivery to Chennai take?',
        answer: 'The expected ETA for Chennai and Tamil Nadu is 1-2 days from dispatch.',
      },
      {
        question: 'How should I water succulents in Chennai?',
        answer: 'Water only after the mix dries. Humid weather slows drying, so daily watering is usually harmful.',
      },
      {
        question: 'Can cactus plants grow in Chennai?',
        answer: 'Yes, cactus plants can grow in bright, airy spots with gritty soil and protection from repeated rain.',
      },
    ],
    relatedHubSlugs: ['monsoon-succulent-care', 'cactus-care-india', 'buy-succulents-online-india'],
  },
  {
    slug: 'low-maintenance-balcony-plants',
    title: 'Low Maintenance Balcony Plants in India',
    h1: 'Low maintenance balcony plants for Indian homes',
    metaDescription: 'Low maintenance balcony plants for India, including succulents, cacti, hanging plants, jade and aloe with simple care and watering tips.',
    intro: 'Low maintenance balcony plants should handle bright light, airflow and missed watering better than delicate foliage plants. For Indian homes, succulents, cactus plants, Jade, Aloe, Crassula, Sedum and selected hanging plants are practical choices when grown in draining pots.',
    answer: 'The best low maintenance balcony plants are succulents, cactus, Jade, Aloe, Crassula, Sedum, Haworthia, Sansevieria and hardy hanging plants. Give them drainage, bright light and water only when needed.',
    image: GUIDE_IMAGE_ASSETS.hanging,
    imageAlt: 'Hanging balcony plants for Rosary Plant House low maintenance plant guide',
    productFilters: {
      categories: ['Succulent', 'Cactus', 'Jade', 'Crassula', 'Aloe', 'Sedum', 'Haworthia', 'Sansevieria', 'Hanging'],
      keywords: ['low maintenance', 'balcony', 'succulent', 'cactus', 'jade', 'aloe', 'hanging', 'sansevieria'],
      watering: ['Low'],
      booleans: ['hanging'],
    },
    sections: [
      {
        heading: 'What low maintenance really means',
        body: [
          'Low maintenance does not mean no care. It means the plant can handle reasonable dry gaps, bright conditions and simple routines without daily watering or constant rescue.',
          'Drainage, pot size and placement matter as much as plant choice. A hardy plant can still fail in a pot that traps water.',
        ],
      },
      {
        heading: 'Best plant groups',
        body: [
          'Succulents and cacti are ideal for bright balconies. Jade, Crassula and Aloe are good for busy homes. Sansevieria and some hanging plants work where light is bright but filtered.',
        ],
      },
      {
        heading: 'Simple weekly routine',
        body: [
          'Check soil dryness, remove dead leaves, rotate pots for even light and water only the plants that are actually dry. During monsoon, check less with the watering can and more with your fingers.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Which balcony plants are easiest to maintain?',
        answer: 'Succulents, cactus, Jade, Aloe, Crassula, Sedum, Haworthia, Sansevieria and hardy hanging plants are among the easiest choices.',
      },
      {
        question: 'Do low maintenance balcony plants need daily water?',
        answer: 'No. Most low maintenance succulent and cactus plants prefer drying between watering sessions.',
      },
      {
        question: 'Can low maintenance plants survive monsoon?',
        answer: 'Yes, if they are protected from repeated rain, given airflow and kept in a fast-draining potting mix.',
      },
    ],
    relatedHubSlugs: ['low-water-balcony-plants', 'hanging-plants-balcony', 'monsoon-succulent-care'],
  },
  {
    slug: 'cactus-plants-online-india',
    title: 'Cactus Plants Online in India',
    h1: 'Buy cactus plants online in India',
    metaDescription: 'Buy cactus plants online in India with beginner care tips for light, soil, watering, monsoon protection and safe plant delivery.',
    intro: 'Cactus plants are strong visual plants for bright balconies, sunny windows and dry corners. Buying cactus plants online is easiest when you choose healthy, compact plants and understand that they need strong light, gritty soil and controlled watering after delivery.',
    answer: 'When buying cactus plants online in India, choose bright-light plants with clear photos, price, availability and care notes. Keep them in strong light, use gritty soil and protect them from repeated monsoon rain.',
    image: GUIDE_IMAGE_ASSETS.flowering,
    imageAlt: 'Flowering cactus selection for Rosary Plant House cactus plants online guide',
    productFilters: {
      categories: ['Cactus'],
      keywords: ['cactus', 'cacti', 'mammillaria', 'gymnocalycium', 'opuntia', 'cereus', 'flowering cactus'],
      watering: ['Low'],
      sunlight: ['High', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'Choosing cactus plants online',
        body: [
          'Look for clear photos, a stable plant shape and notes about light and watering. Compact cactus plants are often easier to place on balconies, windowsills and shelf displays with enough light.',
        ],
      },
      {
        heading: 'Care after delivery',
        body: [
          'Unpack carefully and keep the cactus in bright shade first. Move it toward stronger light gradually. Water only after checking that the potting mix is dry and the plant is ready.',
        ],
      },
      {
        heading: 'Common cactus mistakes',
        body: [
          'The most common mistakes are dark placement, daily watering, decorative pots without drainage and leaving cactus plants exposed to repeated rain during monsoon.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can I buy cactus plants online for indoor use?',
        answer: 'Yes, but most cactus plants still need a very bright sunny window or balcony. Dark rooms are not suitable long term.',
      },
      {
        question: 'Do cactus plants need frequent watering?',
        answer: 'No. Cactus plants prefer deep but infrequent watering after the soil dries fully.',
      },
      {
        question: 'Are cactus plants good for beginners?',
        answer: 'Yes, if you can provide strong light, drainage and careful watering.',
      },
    ],
    relatedHubSlugs: ['cactus-care-india', 'buy-succulents-online-india', 'low-maintenance-balcony-plants'],
  },
  {
    slug: 'ceramic-pot-succulents',
    title: 'Ceramic Pot Succulents',
    h1: 'Ceramic pot succulents for gifts, desks and balconies',
    metaDescription: 'Ceramic pot succulents for gifts, desks and balconies, with tips on drainage, light, watering, styling and safe online ordering.',
    intro: 'Ceramic pot succulents look polished for gifts, desks, shelves and balcony corners. The main care point is drainage: succulents can look beautiful in ceramic pots, but the roots still need a fast-draining mix and careful watering.',
    answer: 'Ceramic pot succulents work best when the pot has drainage or is used as an outer cover. Choose compact succulents, keep them in bright light and water only after the mix dries.',
    image: GUIDE_IMAGE_ASSETS.ceramic,
    imageAlt: 'Ceramic pot succulents from Rosary Plant House for gifts and desks',
    productFilters: {
      categories: ['Succulent', 'Cactus', 'Echeveria', 'Haworthia', 'Crassula', 'Jade', 'Aloe'],
      keywords: ['ceramic', 'pot', 'gift', 'desk', 'succulent', 'cactus', 'echeveria', 'haworthia'],
      watering: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'Pick the right ceramic pot',
        body: [
          'A ceramic pot with a drainage hole is safest. If the ceramic container has no hole, use it as a decorative outer pot and keep the plant in a draining inner pot.',
        ],
      },
      {
        heading: 'Best succulents for ceramic styling',
        body: [
          'Compact Echeveria, Haworthia, Crassula, Jade, Aloe and small cactus plants work well because they stay tidy and do not need large soil volume.',
        ],
      },
      {
        heading: 'Watering and placement',
        body: [
          'Place ceramic pot succulents in bright light and water carefully. Ceramic can hide trapped moisture, so check the inner mix before watering again.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can succulents grow in ceramic pots?',
        answer: 'Yes, if the pot has drainage or is used as an outer cover for a draining inner pot.',
      },
      {
        question: 'Are ceramic pot succulents good gifts?',
        answer: 'Yes. Compact succulents in neat ceramic pots make good gifts when the receiver gets simple light and watering instructions.',
      },
      {
        question: 'How often should ceramic pot succulents be watered?',
        answer: 'Water only after the mix dries. The exact gap depends on light, pot size, season and airflow.',
      },
    ],
    relatedHubSlugs: ['buy-succulents-online-india', 'indoor-succulent-care', 'low-maintenance-balcony-plants'],
  },
  {
    slug: 'hanging-plants-balcony',
    title: 'Hanging Plants for Balcony Gardens',
    h1: 'Hanging plants for Indian balcony gardens',
    metaDescription: 'Hanging plants for balcony gardens in India, with care tips for light, watering, airflow, trailing growth and online plant delivery.',
    intro: 'Hanging plants make balcony gardens feel fuller without using floor space. For Indian homes, the best hanging choices are plants that can handle airflow, bright filtered light and a watering routine that matches the season.',
    answer: 'Good hanging balcony plants include trailing succulents, Creeper types, Peperomia, selected foliage plants and hardy low-water plants. Use secure hooks, bright light, drainage and careful watering.',
    image: GUIDE_IMAGE_ASSETS.hanging,
    imageAlt: 'Trailing hanging balcony plants for Rosary Plant House balcony garden guide',
    productFilters: {
      categories: ['Hanging', 'Creeper', 'Peperomia', 'Succulent', 'Sedum'],
      keywords: ['hanging', 'trailing', 'creeper', 'balcony', 'peperomia', 'sedum', 'string'],
      booleans: ['hanging'],
      watering: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'Choose plants by light',
        body: [
          'Bright covered balconies can support trailing succulents and Sedum types. Softer bright shade may suit Peperomia and some creeper-style plants better.',
        ],
      },
      {
        heading: 'Watering hanging pots',
        body: [
          'Hanging pots can dry faster in wind but slower during humid weather. Check the potting mix instead of following a fixed daily schedule.',
        ],
      },
      {
        heading: 'Safety and placement',
        body: [
          'Use secure hooks, avoid overloaded pots and place hanging plants where water does not drip onto electrical points or walkways. Rotate plants so trailing growth stays even.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Which hanging plants are good for balconies?',
        answer: 'Trailing succulents, Sedum, Creeper types, Peperomia and hardy foliage plants can work when matched to the balcony light.',
      },
      {
        question: 'Do hanging plants need more water?',
        answer: 'Sometimes they dry faster in wind, but watering still depends on soil dryness, pot size, season and plant type.',
      },
      {
        question: 'Can hanging succulents grow in India?',
        answer: 'Yes, if they get bright light, drainage, airflow and protection from long wet spells.',
      },
    ],
    relatedHubSlugs: ['low-maintenance-balcony-plants', 'low-water-balcony-plants', 'plant-delivery-bangalore'],
  },
  {
    slug: 'coonoor-plant-nursery',
    title: 'Coonoor Plant Nursery for Succulents and Cacti',
    h1: 'Coonoor plant nursery for succulents, cacti and indoor plants',
    metaDescription: 'Coonoor plant nursery guide for Rosary Plant House, covering succulents, cacti, indoor plants, online ordering, support and delivery.',
    intro: 'Rosary Plant House is a Coonoor nursery in The Nilgiris focused on succulents, cactus plants, indoor plants and practical care guidance. The nursery location helps connect online plant buyers with a real source, support channel and plant-specific advice.',
    answer: 'Rosary Plant House is located in Coonoor, The Nilgiris, Tamil Nadu, and sells succulents, cacti, indoor plants and balcony plants online with WhatsApp support and delivery policies.',
    image: GUIDE_IMAGE_ASSETS.group,
    imageAlt: 'Rosary Plant House Coonoor nursery bench with succulents and cactus plants',
    productFilters: {
      categories: ['Succulent', 'Cactus', 'Indoor', 'Hanging', 'Echeveria', 'Jade', 'Crassula', 'Aloe'],
      keywords: ['coonoor', 'nursery', 'nilgiris', 'succulent', 'cactus', 'indoor', 'balcony', 'plant house'],
      watering: ['Low', 'Moderate/Medium', 'Moderate', 'Medium'],
    },
    sections: [
      {
        heading: 'What the nursery focuses on',
        body: [
          'The collection focuses on succulents, cacti, indoor plants, balcony plants and practical plant care. Product pages include plant identity, care notes and support details so buyers can choose with more confidence.',
        ],
      },
      {
        heading: 'Online ordering from Coonoor',
        body: [
          'Plants are dispatched after payment on Monday and Wednesday when payment is completed by the previous day. Delivery coverage includes all over South India and major cities in North India.',
        ],
      },
      {
        heading: 'Support and trust signals',
        body: [
          'WhatsApp support is available every day from 9 AM to 9 PM. Customer feedback, policy pages, guide pages and product care content help buyers understand what to expect before ordering.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Where is Rosary Plant House located?',
        answer: 'Rosary Plant House is located at Samayapuram, Alwarpet, Coonoor, The Nilgiris, Tamil Nadu.',
      },
      {
        question: 'What plants does the Coonoor nursery sell online?',
        answer: 'The catalogue focuses on succulents, cactus plants, indoor plants, balcony plants and hanging plants.',
      },
      {
        question: 'How can I contact Rosary Plant House?',
        answer: 'WhatsApp support is available every day from 9 AM to 9 PM at +91 79040 50237.',
      },
    ],
    relatedHubSlugs: ['buy-succulents-online-india', 'plant-delivery-bangalore', 'plant-delivery-chennai'],
  },
]);

export const GUIDES_INDEX_PATH = '/guides';

export function getContentHubImage(hub = {}) {
  return hub.image || GUIDE_IMAGE_ASSETS.group;
}

export function getContentHubImageAlt(hub = {}) {
  return hub.imageAlt || `${hub.title || 'Plant care guide'} from ${PRODUCT_SEO_SITE.name}`;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function slugToken(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeCareLevel(value) {
  const normalized = normalizeText(value);
  if (['med', 'medium', 'moderate'].includes(normalized)) return 'moderate/medium';
  return normalized;
}

function productSearchText(product = {}) {
  return [
    product.title,
    product.name,
    product.commonName,
    product.category,
    product.seo?.slug,
    product.seo?.metaTitle,
    product.seo?.metaDescription,
    product.schema?.name,
    product.schema?.description,
    product.careGuide?.plantName,
    product.careGuide?.shortDescription,
    product.careGuide?.longDescription,
  ].filter(Boolean).join(' ').toLowerCase();
}

function numericProductId(product = {}) {
  const id = Number.parseInt(String(product.id || '').replace(/\D+/g, ''), 10);
  return Number.isFinite(id) ? id : Number.MAX_SAFE_INTEGER;
}

export function getContentHubPath(hub = {}) {
  return hub?.slug ? `/guides/${hub.slug}` : '/guides';
}

export function getGuidesIndexCanonicalUrl(baseUrl = PRODUCT_SEO_SITE.url) {
  return `${baseUrl.replace(/\/$/, '')}${GUIDES_INDEX_PATH}`;
}

export function getContentHubCanonicalUrl(hub = {}, baseUrl = PRODUCT_SEO_SITE.url) {
  return `${baseUrl.replace(/\/$/, '')}${getContentHubPath(hub)}`;
}

export function getContentHubBySlug(slug) {
  const normalizedSlug = normalizeText(slug);
  return CONTENT_HUBS.find((hub) => hub.slug === normalizedSlug) || null;
}

const RELATED_CATEGORY_ALIASES = new Map([
  ...CATEGORIES.map((category) => [slugToken(category), category]),
  ['cacti', 'Cactus'],
  ['cactus-plant', 'Cactus'],
  ['jade-plant', 'Jade'],
  ['jade-plants', 'Jade'],
  ['succulents', 'Succulent'],
  ['haworthias', 'Haworthia'],
  ['echeverias', 'Echeveria'],
  ['crassulas', 'Crassula'],
  ['peperomias', 'Peperomia'],
  ['bergeranthus-species', 'Succulent'],
  ['chlorophytum', 'Indoor'],
  ['compact-aloe-cluster', 'Aloe'],
  ['dianthus', 'Others'],
  ['donkeys-tail', 'Sedum'],
  ['finger-jade', 'Jade'],
  ['gasteria', 'Succulent'],
  ['graptopetalum', 'Succulent'],
  ['hoodia', 'Succulent'],
  ['huernia-zebrina', 'Succulent'],
  ['hydrangea', 'Others'],
  ['kalanchoe', 'Succulent'],
  ['lapidaria', 'Succulent'],
  ['lifesaver-cactus', 'Succulent'],
  ['lithops', 'Succulent'],
  ['mammillaria', 'Cactus'],
  ['opuntia', 'Cactus'],
  ['peanut-cactus', 'Cactus'],
  ['philodendron', 'Indoor'],
  ['portulaca', 'Succulent'],
  ['sempervivum', 'Succulent'],
  ['string-of-necklace', 'Hanging'],
  ['string-of-necklaces', 'Hanging'],
  ['titanopsis', 'Succulent'],
  ['tradescantia', 'Creeper'],
  ['variegated-chlorophytum', 'Indoor'],
]);

const RELATED_CARE_GUIDE_ALIASES = new Map([
  ['succulent-care-guide', 'succulents-in-india'],
  ['succulent-care', 'succulents-in-india'],
  ['watering-succulents', 'succulents-in-india'],
  ['monsoon-succulent-care', 'monsoon-succulent-care'],
  ['balcony-succulent-care', 'low-water-balcony-plants'],
  ['indoor-plant-care', 'indoor-succulent-care'],
  ['indoor-succulent-care', 'indoor-succulent-care'],
  ['bright-indirect-light-plants', 'indoor-succulent-care'],
  ['bright-light-plants', 'low-water-balcony-plants'],
  ['balcony-plant-care', 'low-water-balcony-plants'],
  ['low-water-plants', 'low-water-balcony-plants'],
  ['cactus-care-guide', 'cactus-care-india'],
  ['cactus-and-mesemb-watering', 'cactus-care-india'],
  ['watering-cactus', 'cactus-care-india'],
  ['watering-indoor-plants', 'indoor-succulent-care'],
  ['echeveria-care-guide', 'succulents-in-india'],
  ['haworthia-care-guide', 'indoor-succulent-care'],
  ['jade-plant-care-guide', 'low-water-balcony-plants'],
  ['sunny-balcony-plants', 'low-water-balcony-plants'],
  ['trailing-succulent-care', 'hanging-plants-balcony'],
  ['trailing-plant-care', 'hanging-plants-balcony'],
  ['hanging-plant-care', 'hanging-plants-balcony'],
  ['hanging-plants', 'hanging-plants-balcony'],
  ['flowering-plant-care', 'cactus-plants-online-india'],
]);

const RELATED_PROBLEM_GUIDE_ALIASES = new Map([
  ['succulent-root-rot', 'root-rot-succulent-care'],
  ['cactus-root-rot', 'root-rot-succulent-care'],
  ['root-rot', 'root-rot-succulent-care'],
  ['root-rot-guide', 'root-rot-succulent-care'],
  ['succulent-stem-rot', 'root-rot-succulent-care'],
  ['succulent-leaf-yellowing', 'root-rot-succulent-care'],
  ['yellow-leaves-guide', 'root-rot-succulent-care'],
  ['leaf-yellowing', 'root-rot-succulent-care'],
  ['succulent-leggy-growth', 'indoor-succulent-care'],
  ['leggy-growth', 'indoor-succulent-care'],
  ['succulent-sunburn', 'indoor-succulent-care'],
  ['cactus-sunburn', 'cactus-care-india'],
  ['succulent-leaf-drop', 'monsoon-succulent-care'],
  ['succulent-pests', 'monsoon-succulent-care'],
  ['cactus-pests', 'cactus-care-india'],
  ['indoor-plant-pests', 'indoor-succulent-care'],
  ['flower-drop-guide', 'cactus-plants-online-india'],
]);

function uniqueLinks(links) {
  const seen = new Set();
  return links.filter((link) => {
    if (!link?.path || seen.has(link.path)) return false;
    seen.add(link.path);
    return true;
  });
}

function resolveRelatedCategoryLink(value) {
  const token = slugToken(value);
  const tokenParts = token.split('-').filter(Boolean);
  const category = RELATED_CATEGORY_ALIASES.get(token) || CATEGORIES.find((candidate) => {
    const categoryToken = slugToken(candidate);
    return token === categoryToken || tokenParts.includes(categoryToken);
  });
  if (!category) return null;

  return {
    label: `${category} plants`,
    path: `/category/${encodeURIComponent(category)}`,
  };
}

function resolveRelatedGuideLink(value, aliases) {
  const token = slugToken(value);
  const slug = aliases.get(token) || token;
  const hub = getContentHubBySlug(slug);
  if (!hub) return null;

  return {
    label: hub.title,
    path: getContentHubPath(hub),
  };
}

export function getProductRelatedSeoLinks(product = {}) {
  const seo = product.seo || {};
  const relatedPlants = Array.isArray(seo.relatedPlants) ? seo.relatedPlants : [];
  const relatedCareGuides = Array.isArray(seo.relatedCareGuides) ? seo.relatedCareGuides : [];
  const relatedProblemGuides = Array.isArray(seo.relatedProblemGuides) ? seo.relatedProblemGuides : [];
  const careGuides = uniqueLinks(
    relatedCareGuides.map((guide) => resolveRelatedGuideLink(guide, RELATED_CARE_GUIDE_ALIASES)).filter(Boolean)
  );
  const problemGuides = uniqueLinks(
    relatedProblemGuides.map((guide) => resolveRelatedGuideLink(guide, RELATED_PROBLEM_GUIDE_ALIASES)).filter(Boolean)
  );

  return {
    plants: uniqueLinks(relatedPlants.map(resolveRelatedCategoryLink).filter(Boolean)),
    careGuides,
    problemGuides,
    guides: uniqueLinks([...careGuides, ...problemGuides]),
  };
}

export function getRelatedContentHubs(hub = {}) {
  return (hub.relatedHubSlugs || [])
    .map(getContentHubBySlug)
    .filter(Boolean);
}

export function scoreProductForContentHub(hub = {}, product = {}) {
  const filters = hub.productFilters || {};
  const category = normalizeText(product.category);
  const watering = normalizeCareLevel(product.watering || product.careGuide?.watering);
  const sunlight = normalizeCareLevel(product.sunlight || product.careGuide?.sunlight);
  const transit = normalizeCareLevel(product.transit);
  const text = productSearchText(product);
  let coreScore = 0;
  let secondaryScore = 0;

  if ((filters.categories || []).map(normalizeText).includes(category)) coreScore += 5;
  if ((filters.watering || []).map(normalizeCareLevel).includes(watering)) coreScore += 3;
  if ((filters.sunlight || []).map(normalizeCareLevel).includes(sunlight)) secondaryScore += 2;
  if ((filters.transit || []).map(normalizeCareLevel).includes(transit)) secondaryScore += 1;

  for (const flag of filters.booleans || []) {
    if (product[flag] === true) coreScore += 4;
  }

  for (const keyword of filters.keywords || []) {
    if (text.includes(normalizeText(keyword))) coreScore += 2;
  }

  return coreScore > 0 ? coreScore + secondaryScore : 0;
}

export function getContentHubProducts(hub = {}, products = [], { limit = 12 } = {}) {
  return products
    .filter(isSeoIndexable)
    .map((product) => ({
      product,
      score: scoreProductForContentHub(hub, product),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || numericProductId(a.product) - numericProductId(b.product))
    .slice(0, limit)
    .map((entry) => entry.product);
}

export function buildContentHubSchemaItems(hub = {}, { baseUrl = PRODUCT_SEO_SITE.url, products = [] } = {}) {
  const publicBase = baseUrl.replace(/\/$/, '');
  const canonicalUrl = getContentHubCanonicalUrl(hub, publicBase);
  const relatedHubs = getRelatedContentHubs(hub);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: hub.title,
      description: hub.metaDescription,
      mainEntityOfPage: canonicalUrl,
      author: {
        '@type': 'Organization',
        name: PRODUCT_SEO_SITE.name,
      },
      publisher: {
        '@type': 'Organization',
        name: PRODUCT_SEO_SITE.name,
      },
      image: getAbsoluteImageUrl(getContentHubImage(hub), publicBase),
      about: [hub.h1, ...(hub.productFilters?.categories || [])].filter(Boolean),
      articleSection: hub.sections?.map((section) => section.heading) || [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: (hub.faqs || []).map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${hub.title} recommended plants`,
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: getProductDisplayName(product),
        url: getProductCanonicalUrl(product, publicBase),
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${publicBase}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Guides',
          item: getGuidesIndexCanonicalUrl(publicBase),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: hub.title,
          item: canonicalUrl,
        },
      ],
    },
    relatedHubs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `${hub.title} related guides`,
          itemListElement: relatedHubs.map((relatedHub, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: relatedHub.title,
            url: getContentHubCanonicalUrl(relatedHub, publicBase),
          })),
        }
      : null,
  ].filter(Boolean);
}
