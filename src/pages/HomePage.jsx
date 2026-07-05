import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { CATEGORIES } from '../config/constants';
import reviewsData from '../data/reviews.json';
import { CONTENT_HUBS, getContentHubPath } from '../utils/contentHubs';
import { SITE_POLICY } from '../utils/siteSeo';

const featuredCategories = CATEGORIES.slice(0, 6);
const featuredGuides = CONTENT_HUBS.slice(0, 3);
const featuredReviews = [
  ...reviewsData.filter((review) => review.featured),
  ...reviewsData.filter((review) => !review.featured),
].slice(0, 4);

const CATEGORY_IMAGES = Object.freeze({
  Succulent: '/home/category-succulent-natural.jpg',
  Cactus: '/home/category-cactus-natural.jpg',
  Echeveria: '/home/category-echeveria-natural.jpg',
  Jade: '/home/category-jade-natural.jpg',
  Crassula: '/home/category-crassula-natural.jpg',
  Peperomia: '/home/category-peperomia-natural.jpg',
});

const HOME_HERO_IMAGE = '/home/hero-natural-nursery.jpg';
const BROWSE_ALL_IMAGE = '/home/browse-every-plant-natural.jpg';

const trustFacts = [
  { title: 'Safe packing', value: 'Bare-rooted live plant packing' },
  { title: 'Delivery ETA', value: 'South India 2-3 days from dispatch' },
  { title: 'Support', value: SITE_POLICY.support.whatsAppHours },
  { title: 'Damage help', value: 'Replacement first, refund if needed' },
];

function firstSentence(value) {
  const [sentence] = String(value || '').split('.');
  return sentence ? `${sentence.trim()}.` : '';
}

function shortReview(value, limit = 130) {
  const text = String(value || '').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}...`;
}

const homeSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'LocalBusiness',
      name: 'Rosary Plant House',
      url: 'https://rosaryplanthouse.com/',
      image: 'https://rosaryplanthouse.com/home/hero-natural-nursery.jpg',
      description: 'Buy succulents, cacti, indoor plants and balcony plants online from Rosary Plant House, Coonoor.',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Samayapuram, Alwarpet',
        addressLocality: 'Coonoor',
        addressRegion: 'Tamil Nadu',
        addressCountry: 'IN',
      },
      telephone: '+917904050237',
      priceRange: 'INR',
    },
    {
      '@type': 'WebPage',
      name: 'Buy Succulents, Cacti and Indoor Plants Online',
      url: 'https://rosaryplanthouse.com/',
      description: 'A Rosary Plant House landing page for plant categories, care guides, reviews, support and online plant shopping.',
      mainEntity: {
        '@type': 'ItemList',
        name: 'Rosary Plant House shopping categories',
        itemListElement: featuredCategories.map((category, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: `${category} plants`,
          url: `https://rosaryplanthouse.com/category/${encodeURIComponent(category)}`,
        })),
      },
    },
  ],
};

export default function HomePage() {
  return (
    <div className="animate-fade-in space-y-10 pb-12">
      <SEO
        title="Buy Succulents, Cacti and Indoor Plants Online"
        description="Buy rare succulents, cacti, indoor plants and low water balcony plants online from Rosary Plant House, Coonoor. Shop plants, care guides and WhatsApp support."
        image={HOME_HERO_IMAGE}
        canonicalUrl="https://rosaryplanthouse.com/"
        schemaData={homeSchema}
      />

      <section className="relative overflow-hidden rounded-lg min-h-[440px] bg-black text-white">
        <img
          src={HOME_HERO_IMAGE}
          alt="Natural nursery collection at Rosary Plant House"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/48 to-black/12" />
        <div className="relative flex min-h-[440px] max-w-3xl flex-col justify-end px-5 py-9 sm:px-8 md:px-10 md:py-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/75">
            Rosary Plant House, Coonoor
          </p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            Bringing Nature's Finest Succulents & Plants to You
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/88">
            Shop healthy bare-rooted succulents, cacti and indoor plants from the Nilgiris with care guidance and WhatsApp support.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#12382a] shadow-sm transition hover:bg-white/90"
            >
              Shop all plants
            </Link>
            <Link
              to="/guides"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/45 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Care guides
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="home-categories"
        className="rounded-lg border-2 border-[var(--color-forest)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-forest)]">
              Shop by category
            </p>
            <h2 id="home-categories" className="mt-1 text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              Pick a plant type
            </h2>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.65fr)]">
          <Link
            to="/shop"
            className="group relative flex min-h-56 overflow-hidden rounded-lg bg-[var(--color-forest)] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <img
              src={BROWSE_ALL_IMAGE}
              alt="Browse the full Rosary Plant House collection"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/24 to-transparent" />
            <span className="relative mt-auto block px-5 pb-20 pt-5 sm:p-5">
              <span className="block text-xs font-semibold uppercase tracking-wide text-white/75">Full catalogue</span>
              <span className="mt-1 block text-2xl font-bold leading-tight">Browse every plant</span>
            </span>
          </Link>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {featuredCategories.map((category) => {
              const image = CATEGORY_IMAGES[category];
              return (
                <Link
                  key={category}
                  to={`/category/${encodeURIComponent(category)}`}
                  className="group overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] transition hover:-translate-y-0.5 hover:border-[var(--color-forest)] hover:shadow-md"
                >
                  <img
                    src={image}
                    alt={`${category} plants`}
                    className="h-28 w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="block px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Category
                  </span>
                  <span className="block px-3 pb-3 pt-1 text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--color-forest)]">
                    {category}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="home-guides" className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-forest)]">Care guides</p>
            <h2 id="home-guides" className="mt-1 text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              Quick care answers
            </h2>
          </div>
          <Link to="/guides" className="text-sm font-semibold text-[var(--color-forest)] hover:underline">
            View all guides
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {featuredGuides.map((hub) => (
            <Link
              key={hub.slug}
              to={getContentHubPath(hub)}
              className="card group block p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-forest)]">
                {hub.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{firstSentence(hub.answer)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="home-trust" className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-forest)]">Trust details</p>
            <h2 id="home-trust" className="mt-1 text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              Before you order
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/policies" className="text-sm font-semibold text-[var(--color-forest)] hover:underline">
              Policies
            </Link>
            <Link to="/contact" className="text-sm font-semibold text-[var(--color-forest)] hover:underline">
              Contact
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trustFacts.map((fact) => (
            <div key={fact.title} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-forest)]">{fact.title}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{fact.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="home-reviews" className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-forest)]">Reviews</p>
            <h2 id="home-reviews" className="mt-1 text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              What Our Customers Say
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Trusted by plant lovers across India</p>
          </div>
          <Link to="/reviews" className="text-sm font-semibold text-[var(--color-forest)] hover:underline">
            Read reviews
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {featuredReviews.map((review) => (
            <article key={`${review.author}-${review.text}`} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[var(--text-primary)]">{review.author}</h3>
                <span className="text-sm font-semibold text-[var(--color-terracotta)]">{review.rating}/5</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">"{shortReview(review.text)}"</p>
            </article>
          ))}
        </div>
        <div className="flex flex-col items-center gap-4 pt-2">
          <Link
            to="/insta-reviews"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-forest)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-forest-light)]"
          >
            Watch Stories Reviews
          </Link>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://www.facebook.com/rosaryplanthouse/reviews" target="_blank" rel="noopener noreferrer" className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--color-forest)]">
              Facebook Reviews
            </a>
            <a href="https://www.instagram.com/rosary_plant_house" target="_blank" rel="noopener noreferrer" className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--color-forest)]">
              Insta Reviews
            </a>
            <a href="https://maps.app.goo.gl/h5ziUGAuvC4FZZqn8" target="_blank" rel="noopener noreferrer" className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--color-forest)]">
              Google Reviews
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
