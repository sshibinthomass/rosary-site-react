import Icon from '../components/Icon';
import SEO from '../components/SEO';
import { DeepPanel, NumberedStep, PageBar, PhotoBanner } from '../components/storefront';
import { NURSERY_ADDRESS_LINES, NURSERY_MAP_URL } from '../config/constants';
import reviewsData from '../data/reviews.json';
import { buildWhatsAppLink } from '../utils/nurseryMessages';

const ABOUT_HERO_IMAGE = '/home/hero-natural-nursery-1200.webp';

/** The review quoted in the panel, by author, so the words stay a real one. */
const QUOTED_REVIEW_AUTHOR = 'Vinda Sridhar';

const reviewCount = reviewsData.length;
const averageRating = (
  reviewsData.reduce((total, review) => total + (review.rating || 0), 0) / reviewCount
).toFixed(1);

const quotedReview = reviewsData.find((review) => review.author === QUOTED_REVIEW_AUTHOR)
  || reviewsData.find((review) => review.featured)
  || reviewsData[0];

const visitWhatsAppLink = buildWhatsAppLink(
  'Hello Rosary Plant House, I would like to visit the nursery. When is someone at the bench?'
);

const STATS = [
  { value: 'Since 2020', label: 'Shipping across India' },
  { value: '300+', label: 'Plants on the bench' },
  { value: 'Grown here', label: 'No resales, ever' },
  { value: averageRating, label: `Across ${reviewCount} reviews` },
];

const STEPS = [
  {
    title: 'Propagated on our benches',
    body: 'From leaves and offsets of our own mother plants, in Nilgiris weather.',
  },
  {
    title: 'Grown on until it is sturdy',
    body: 'We only list a plant once it can take a three-day journey.',
  },
  {
    title: 'Packed the morning it ships',
    body: 'Bare-root, wrapped by hand, one plant at a time.',
  },
];

export default function AboutPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-2xl pb-8">
      <SEO
        title="About Us"
        description="Learn about Rosary Plant House — a nursery in the Nilgiris, Coonoor, bringing beautiful succulents, cacti and indoor plants to your home."
        canonicalUrl="https://rosaryplanthouse.com/about"
      />

      <PageBar title="About us" asHeading={false} />

      <PhotoBanner
        src={ABOUT_HERO_IMAGE}
        alt="The Rosary Plant House nursery in Coonoor"
        eyebrow="Women-led · Coonoor"
        title="A small nursery in the Nilgiris"
          titleAs="h1"
        height="h-[300px]"
      />

      <p className="mt-6 text-base leading-[1.7] text-[var(--text-secondary)]">
        Rosary Plant House is a women-led family nursery in Coonoor. Every plant we sell comes
        directly from our own benches — we grow it, we propagate it, we pack it. Nothing is bought
        in from a wholesaler and resold.
      </p>
      <p className="mt-4 text-base leading-[1.7] text-[var(--text-secondary)]">
        That is the whole reason we can tell you how a plant behaves in an Indian home. We have
        watched it grow through our own monsoons.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-[24px] bg-[var(--color-sage-200)] p-[18px]">
            <p className="font-display text-[26px] leading-none text-[var(--color-sage-900)]">
              {stat.value}
            </p>
            <p className="mt-1.5 text-xs leading-snug text-[var(--color-sage-800)]">{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3.5 mt-8 font-display text-[23px] text-[var(--text-primary)]">
        How a plant gets to you
      </h2>
      <div className="space-y-3">
        {STEPS.map((step, index) => (
          <NumberedStep key={step.title} index={index + 1} title={step.title} tone="light">
            {step.body}
          </NumberedStep>
        ))}
      </div>

      <DeepPanel eyebrow="Why people come back" className="mt-8">
        <blockquote className="font-display text-xl leading-[1.3] text-[var(--panel-deep-text)]">
          “{quotedReview.text}”
        </blockquote>
        <p className="mt-3.5 text-[13px] font-bold text-[var(--panel-deep-muted)]">
          {quotedReview.author}
        </p>
      </DeepPanel>

      <h2 className="mb-3 mt-8 font-display text-[23px] text-[var(--text-primary)]">Come and see</h2>
      <div className="rounded-[28px] bg-[var(--bg-secondary)] p-5">
        <p className="mb-1.5 text-[15px] font-bold text-[var(--text-primary)]">
          {NURSERY_ADDRESS_LINES[0]}
        </p>
        <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          {NURSERY_ADDRESS_LINES[1]}. Message before you visit so someone is at the bench.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <a
            href={NURSERY_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Get directions
          </a>
          <a
            href={visitWhatsAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <Icon name="whatsapp" filled className="h-[17px] w-[17px]" />
            Message first
          </a>
        </div>
      </div>
    </div>
  );
}
