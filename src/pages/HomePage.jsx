import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import SEO from '../components/SEO';
import { DeepPanel, EmptyState, NumberedStep, QuantityStepper, SectionHeading } from '../components/storefront';
import { CATEGORIES, CURRENCY } from '../config/constants';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import reviewsData from '../data/reviews.json';
import { getLatestProducts } from '../services/productService';
import { SPOT_ENTRIES } from '../utils/careInference';
import { resolveImageUrl } from '../utils/imageCompressor';
import { getStorefrontProductTitle } from '../utils/productPresentation';
import { getProductDisplayName, getProductPath } from '../utils/productSeo';

const featuredCategories = CATEGORIES.slice(0, 6);
const featuredReviews = [
  ...reviewsData.filter((review) => review.featured),
  ...reviewsData.filter((review) => !review.featured),
].slice(0, 4);

const CATEGORY_IMAGES = Object.freeze({
  Succulent: '/home/category-succulent-natural-360.webp',
  Cactus: '/home/category-cactus-natural-360.webp',
  Echeveria: '/home/category-echeveria-natural-360.webp',
  Jade: '/home/category-jade-natural-360.webp',
  Crassula: '/home/category-crassula-natural-360.webp',
  Peperomia: '/home/category-peperomia-natural-360.webp',
});

const HOME_HERO_IMAGE = '/home/hero-natural-nursery-1200.webp';
const HOME_HERO_SEO_IMAGE = '/home/hero-natural-nursery.jpg';
const BROWSE_ALL_IMAGE = '/home/browse-every-plant-natural-900.webp';

const SEARCH_HINT_EXAMPLES = Object.freeze([
  'low water',
  'low light',
  'flowering',
  'cactus',
  'under 60',
]);
const TYPEWRITER_HINT_DELAYS = Object.freeze({ type: 80, hold: 1000, delete: 40, next: 240 });

/**
 * The catalogue lives in Firestore, so the home page cannot count the matches
 * for a spot without pulling every product. Name the plants each spot is known
 * for instead; the row still links to the search that produces the real list.
 */
const SPOT_EXAMPLE_NAMES = Object.freeze({
  'bright-balcony': 'Cacti, echeveria, sempervivum',
  indoors: 'Haworthia, peperomia, sansevieria',
});

/** Same reason: the true catalogue minimum is not available without a full load. */
const STARTING_PRICE = 49;

const STAT_STRIP = Object.freeze([
  { id: 'price', value: `${CURRENCY}${STARTING_PRICE}`, label: 'Starting from' },
  { id: 'reach', value: 'All India', label: 'South India 2–3 days, metros 4–5' },
  { id: 'hours', value: '9–9', label: 'WhatsApp, every day' },
]);

const TRAVEL_STEPS = Object.freeze([
  {
    title: 'You send the cart on WhatsApp',
    body: 'Every day, 9 AM to 9 PM. No account needed.',
  },
  {
    title: 'We tell you the delivery charge',
    body: 'You pay the total by GPay, PayTM, PhonePe or net banking after that. No cash on delivery.',
  },
  {
    title: 'Packed bare-root, Monday or Wednesday',
    body: 'Tissue, cotton and cocopeat, chosen per plant. Pots are not included unless mentioned.',
  },
  {
    title: 'Couriered to your door',
    body: 'DTDC by default, or Speed Post and Professional Courier on request. Tamil Nadu and Bengaluru 1–2 days, rest of South India 2–3. Damaged in transit? Send a video on the delivery day and we replace it.',
  },
]);

const BENCH_CARE_TILES = Object.freeze([
  { key: 'watering', label: 'Water', icon: 'droplet', tone: 'text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]', fallback: 'Med' },
  { key: 'sunlight', label: 'Sun', icon: 'sun', tone: 'text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]', fallback: 'Med' },
  { key: 'transit', label: 'Ship', icon: 'package', tone: 'text-[var(--text-secondary)]', fallback: 'Safe' },
]);

const EXTERNAL_REVIEW_LINKS = Object.freeze([
  { label: 'Facebook Reviews', href: 'https://www.facebook.com/rosaryplanthouse/reviews', icon: 'facebook', filled: true },
  { label: 'Insta Reviews', href: 'https://www.instagram.com/rosary_plant_house', icon: 'instagram', filled: false },
  { label: 'Google Reviews', href: 'https://maps.app.goo.gl/h5ziUGAuvC4FZZqn8', icon: 'map-pin', filled: false },
]);

function reviewEyebrow(text) {
  const value = String(text || '');
  if (/\b(second|third|again|repeat|regular|since \d{4})\b/i.test(value)) return 'Repeat buyer';
  if (/\bfirst\b/i.test(value)) return 'First order';
  return 'Verified buyer';
}

function shortReview(value, limit = 150) {
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

/** Compact 2-up product tile. ProductCard is the wider shop card and does not fit here. */
function BenchTile({ product, index }) {
  const location = useLocation();
  const { addToCart, addToWishlist, cart, removeFromCart, removeFromWishlist, isInWishlist, updateQuantity } = useCart();
  const { error } = useToast();

  const name = getStorefrontProductTitle(product);
  const productPath = getProductPath({ ...product, title: getProductDisplayName(product) });
  const productLinkState = { backgroundLocation: location, product };
  const price = product.salesPrice || product.price;
  const originalPrice = product.originalPrice;
  const hasDiscount = originalPrice && originalPrice > price;
  const category = product.category || 'Plant';
  const inWishlist = isInWishlist(product.id);
  const cartLine = cart.find((item) => item.productId === product.id);
  const cartQuantity = cartLine?.quantity || 0;
  const image = resolveImageUrl(
    Array.isArray(product.imageUrls) && product.imageUrls.length ? product.imageUrls[0] : product.imageUrl
  );

  const handleAdd = async () => {
    try {
      await addToCart({ ...product, id: product.id, name, price }, 1);
    } catch {
      error('Failed to add to cart');
    }
  };

  // Stepping down to zero takes the plant back out of the cart.
  const handleQuantity = async (nextQuantity) => {
    try {
      await updateQuantity(product.id, nextQuantity);
    } catch {
      error('Failed to update the cart');
    }
  };

  const handleRemove = async () => {
    try {
      await removeFromCart(product.id);
    } catch {
      error('Failed to remove from cart');
    }
  };

  const handleToggleWishlist = async () => {
    try {
      if (inWishlist) await removeFromWishlist(product.id);
      else await addToWishlist({ ...product, id: product.id, name, price });
    } catch {
      error('Failed to update wishlist');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[var(--bg-tertiary)]">
      <div className="relative">
        <img
          src={image || '/placeholder-plant.jpg'}
          alt={`${name} - ${category} from Rosary Plant House`}
          className="washed aspect-square w-full object-cover"
          loading={index < 2 ? 'eager' : 'lazy'}
          width="360"
          height="360"
        />
        <Link
          to={productPath}
          state={productLinkState}
          className="absolute inset-0 z-10"
          aria-label={`View ${name}`}
        />
        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={inWishlist ? `Remove ${name} from wishlist` : `Save ${name}`}
          className={`absolute right-2 top-2 z-20 flex h-[30px] w-[30px] items-center justify-center rounded-full transition-colors ${
            inWishlist
              ? 'bg-[var(--color-accent-200)] text-[var(--color-accent-700)]'
              : 'bg-[rgba(249,244,237,0.92)] text-[var(--text-primary)]'
          }`}
        >
          <Icon name="heart" filled={inWishlist} className="h-[15px] w-[15px]" />
        </button>
      </div>

      <div className="px-3.5 pb-4 pt-3.5">
        <Link
          to={productPath}
          state={productLinkState}
          className="block font-display text-[15px] leading-[1.15] text-[var(--text-primary)] transition-colors hover:text-[var(--color-accent-700)] dark:hover:text-[var(--color-accent-300)]"
        >
          {name}
        </Link>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
          #{product.id} &middot; {category}
        </p>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {BENCH_CARE_TILES.map((tile) => (
            <div key={tile.key} className="flex flex-col items-center gap-0.5 rounded-xl bg-[var(--bg-secondary)] px-1 py-1.5">
              <Icon name={tile.icon} className={`h-[13px] w-[13px] ${tile.tone}`} />
              <span className="text-[8px] font-bold uppercase leading-none tracking-[0.06em] text-[var(--text-secondary)]">
                {tile.label}
              </span>
              <span className="text-[11px] font-bold leading-[1.1] text-[var(--text-primary)]">
                {product[tile.key] || tile.fallback}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-display text-[18px] text-[var(--text-primary)]">
              {CURRENCY}{price?.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <span className="text-[11px] text-[var(--text-secondary)] line-through">
                {CURRENCY}{originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </span>
          {cartQuantity ? (
            <button
              type="button"
              onClick={handleRemove}
              aria-label={`Remove ${name} from cart`}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--color-sage-200)] text-[var(--color-sage-800)] transition-colors hover:text-[var(--color-accent-700)]"
            >
              <Icon name="x" className="h-[17px] w-[17px]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              aria-label={`Add ${name} to cart`}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--color-terracotta)] text-[#f5ead8] transition-opacity hover:opacity-90 dark:text-[#201e1d]"
            >
              <Icon name="plus" className="h-[17px] w-[17px]" />
            </button>
          )}
        </div>

        {/* The tile is too narrow to hold the price and the stepper on one line. */}
        {cartQuantity > 0 && (
          <QuantityStepper
            size="sm"
            value={cartQuantity}
            min={0}
            onDecrease={() => handleQuantity(cartQuantity - 1)}
            onIncrease={() => handleQuantity(cartQuantity + 1)}
            className="mt-2 w-full justify-between border-transparent bg-[var(--color-sage-200)]"
          />
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [benchProducts, setBenchProducts] = useState([]);
  const [benchLoading, setBenchLoading] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [typewriterHint, setTypewriterHint] = useState({ index: 0, charCount: 0, deleting: false });

  const activeHintExample = SEARCH_HINT_EXAMPLES[typewriterHint.index] || SEARCH_HINT_EXAMPLES[0];
  const animatedSearchHint = prefersReducedMotion
    ? `Try ${SEARCH_HINT_EXAMPLES[0]}`
    : `Try ${activeHintExample.slice(0, typewriterHint.charCount)}|`;

  // The search lives here, but the results live on /shop. Hand the typed query
  // over on submit rather than sending everyone who taps the field to the shop.
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : '/shop');
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(motionQuery.matches);
    updateMotionPreference();

    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', updateMotionPreference);
      return () => motionQuery.removeEventListener('change', updateMotionPreference);
    }

    motionQuery.addListener(updateMotionPreference);
    return () => motionQuery.removeListener(updateMotionPreference);
  }, []);

  useEffect(() => {
    // The hint is a placeholder, so it is invisible — and pointless — once someone types.
    if (typeof window === 'undefined' || prefersReducedMotion || searchQuery) return undefined;

    const delay = typewriterHint.deleting
      ? typewriterHint.charCount === 0
        ? TYPEWRITER_HINT_DELAYS.next
        : TYPEWRITER_HINT_DELAYS.delete
      : typewriterHint.charCount >= activeHintExample.length
        ? TYPEWRITER_HINT_DELAYS.hold
        : TYPEWRITER_HINT_DELAYS.type;

    const timeoutId = window.setTimeout(() => {
      setTypewriterHint((previousHint) => {
        const previousExample = SEARCH_HINT_EXAMPLES[previousHint.index] || SEARCH_HINT_EXAMPLES[0];

        if (!previousHint.deleting && previousHint.charCount < previousExample.length) {
          return { ...previousHint, charCount: previousHint.charCount + 1 };
        }
        if (!previousHint.deleting) {
          return { ...previousHint, deleting: true };
        }
        if (previousHint.charCount > 0) {
          return { ...previousHint, charCount: previousHint.charCount - 1 };
        }
        return {
          index: (previousHint.index + 1) % SEARCH_HINT_EXAMPLES.length,
          charCount: 0,
          deleting: false,
        };
      });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [activeHintExample.length, prefersReducedMotion, searchQuery, typewriterHint]);

  useEffect(() => {
    let cancelled = false;

    getLatestProducts(6)
      .then((latest) => {
        if (!cancelled) setBenchProducts(latest || []);
      })
      .catch(() => {
        if (!cancelled) setBenchProducts([]);
      })
      .finally(() => {
        if (!cancelled) setBenchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-8 pb-6">
      <SEO
        title="Buy Succulents, Cacti and Indoor Plants Online"
        description="Buy rare succulents, cacti, indoor plants and low water balcony plants online from Rosary Plant House, Coonoor. Shop plants, care guides and WhatsApp support."
        image={HOME_HERO_SEO_IMAGE}
        canonicalUrl="https://rosaryplanthouse.com/"
        schemaData={homeSchema}
      />

      {/* Search entry — the home page hands the query over to /shop */}
      <form role="search" onSubmit={handleSearchSubmit}>
        <div className="flex min-h-11 w-full items-center gap-3 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-3 transition-colors focus-within:border-[var(--color-terracotta)]">
          <button
            type="submit"
            aria-label="Search plants"
            className="shrink-0 text-[var(--text-secondary)] transition-colors hover:text-[var(--color-terracotta)]"
          >
            <Icon name="search" className="h-[18px] w-[18px]" />
          </button>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={animatedSearchHint}
            aria-label="Search plants"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>
      </form>

      {/* Hero + the intro card that overlaps it */}
      <section className="relative overflow-hidden" aria-labelledby="home-hero-title">
        <div className="relative h-[400px] overflow-hidden rounded-[28px]">
          <img
            src={HOME_HERO_IMAGE}
            alt="Succulent benches at the Rosary Plant House nursery in Coonoor"
            className="washed h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
            width="1200"
            height="600"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(39,46,27,0.72)] via-[rgba(39,46,27,0.12)] to-transparent" />
          <span className="absolute left-5 top-5 inline-flex items-center gap-[7px] rounded-full bg-[var(--color-sage-100)] px-3.5 py-[7px] text-xs font-semibold text-[var(--color-sage-900)]">
            <span className="h-[7px] w-[7px] rounded-full bg-[#7a8a5e]" />
            Women-led &middot; directly from our nursery
          </span>
          <div className="absolute inset-x-5 bottom-12 text-[#f9f4ed]">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sage-200)]">
              Coonoor &middot; The Nilgiris
            </p>
            <h1 id="home-hero-title" className="font-display text-[33px] leading-[1.08]">
              Succulents grown on our own bench
            </h1>
          </div>
        </div>

        <div className="relative -mt-[26px] px-3">
          <div className="rounded-[28px] bg-[var(--bg-secondary)] p-5 shadow-[0_3px_10px_rgba(46,43,37,0.16)]">
            <p className="sr-only">Bringing Nature's Finest Succulents &amp; Plants to You</p>
            <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
              A small nursery in the hills, worked by hand. Plants are lifted from the bench the day you order and packed bare-root the morning they ship.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                to="/shop"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--color-terracotta)] px-5 font-display text-[15px] text-[#f5ead8] transition-opacity hover:opacity-90 dark:text-[#201e1d]"
              >
                Shop all plants
              </Link>
              <Link
                to="/guides"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-color)] px-4 font-display text-[15px] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
              >
                Care guides
              </Link>
              <Link
                to="/reviews"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-color)] px-4 font-display text-[15px] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
              >
                Customer reviews
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <div className="-mx-4 flex items-stretch justify-between bg-[var(--panel-deep)] px-5 py-4 sm:mx-0 sm:rounded-[28px]">
        {STAT_STRIP.map((stat, index) => (
          <div key={stat.id} className="flex flex-1 items-stretch">
            {index > 0 && <span aria-hidden="true" className="mx-3.5 w-px bg-[rgba(249,244,237,0.22)]" />}
            <div className="min-w-0 flex-1">
              <p className="font-display text-[21px] leading-[1.1] text-[var(--panel-deep-text)]">{stat.value}</p>
              <p className="mt-1 text-[11px] leading-[1.3] text-[var(--panel-deep-muted)]">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Start with your spot */}
      <section aria-labelledby="home-spots">
        <h2 id="home-spots" className="font-display text-[25px] text-[var(--text-primary)]">
          Start with your spot
        </h2>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Not the botanical name. Where the plant will actually live.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          {SPOT_ENTRIES.map((entry) => (
            <Link
              key={entry.id}
              to={`/shop?q=${encodeURIComponent(entry.query)}`}
              className="flex items-center gap-3.5 rounded-[28px] bg-[var(--color-sage-200)] px-4 py-3.5 transition-opacity hover:opacity-90"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--color-sage-700)]">
                <Icon name={entry.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[17px] leading-[1.15] text-[var(--color-neutral-900)]">
                  {entry.title}
                </span>
                <span className="mt-0.5 block text-xs leading-[1.4] text-[var(--color-sage-900)]">
                  {entry.describe(SPOT_EXAMPLE_NAMES[entry.id])}
                </span>
              </span>
              <Icon name="chevron-right" className="h-[18px] w-[18px] shrink-0 text-[var(--color-sage-700)]" />
            </Link>
          ))}
        </div>
      </section>

      {/* Shop by type */}
      <section aria-labelledby="home-categories">
        <SectionHeading title="Shop by type" action={`All ${CATEGORIES.length}`} actionTo="/shop" />
        <div className="no-scrollbar -mx-4 mt-4 flex gap-4 overflow-x-auto px-4">
          {featuredCategories.map((category) => (
            <Link
              key={category}
              to={`/category/${encodeURIComponent(category)}`}
              className="flex w-24 shrink-0 flex-col items-center gap-2.5"
            >
              <img
                src={CATEGORY_IMAGES[category]}
                alt={`${category} plants`}
                className="washed h-24 w-24 rounded-full object-cover"
                loading="lazy"
                width="360"
                height="360"
              />
              <span className="text-center font-display text-sm text-[var(--text-primary)]">{category}</span>
            </Link>
          ))}
          <Link to="/shop" className="flex w-24 shrink-0 flex-col items-center gap-2.5">
            <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[var(--color-forest)] text-[#f9f4ed]">
              <img
                src={BROWSE_ALL_IMAGE}
                alt=""
                className="washed absolute inset-0 h-full w-full object-cover opacity-60"
                loading="lazy"
                width="900"
                height="507"
              />
              <Icon name="chevron-right" className="relative h-6 w-6" />
            </span>
            <span className="text-center font-display text-sm leading-tight text-[var(--text-primary)]">
              Browse every plant
            </span>
          </Link>
        </div>
      </section>

      {/* New on the bench */}
      <section aria-labelledby="home-bench">
        <SectionHeading title="New on the bench" action="See all" actionTo="/shop" />
        {benchLoading ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4, 5].map((slot) => (
              <div key={slot} className="overflow-hidden rounded-[28px] bg-[var(--bg-tertiary)]">
                <div className="skeleton-shimmer aspect-square w-full" />
                <div className="space-y-2 px-3.5 py-4">
                  <div className="skeleton-shimmer h-4 w-3/4 rounded-full" />
                  <div className="skeleton-shimmer h-3 w-1/2 rounded-full" />
                  <div className="skeleton-shimmer h-8 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : benchProducts.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {benchProducts.map((product, index) => (
              <BenchTile key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="sprout"
            title="The bench is being restocked"
            description="Nothing is loaded here right now. The full catalogue is still one tap away."
          >
            <Link
              to="/shop"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-terracotta)] px-5 font-display text-[15px] text-[#f5ead8] dark:text-[#201e1d]"
            >
              Open the shop
            </Link>
          </EmptyState>
        )}
      </section>

      {/* How your plant travels */}
      <DeepPanel eyebrow="Before you order" title="How your plant travels">
        <div className="flex flex-col gap-[18px]">
          {TRAVEL_STEPS.map((step, index) => (
            <NumberedStep key={step.title} index={index + 1} title={step.title}>
              {step.body}
            </NumberedStep>
          ))}
        </div>
      </DeepPanel>

      {/* Reviews */}
      <section aria-labelledby="home-reviews">
        <SectionHeading
          title="40+ reviews, 5 stars"
          description="What Our Customers Say"
          action="Read all"
          actionTo="/reviews"
        />
        <div className="-mx-4 mt-4 overflow-hidden">
          <div className="rph-rail gap-3">
            {[...featuredReviews, ...featuredReviews].map((review, index) => (
              <article
                key={`${review.author}-${index}`}
                className="w-[306px] shrink-0 rounded-[28px] bg-[var(--bg-secondary)] px-5 py-5"
              >
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  {reviewEyebrow(review.text)}
                </p>
                <p className="font-display text-[19px] leading-[1.28] text-[var(--text-primary)]">
                  &ldquo;{shortReview(review.text)}&rdquo;
                </p>
                <p className="mt-3.5 text-[13px] font-semibold text-[var(--text-secondary)]">
                  {review.author} &middot; {review.rating}/5
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            to="/insta-reviews"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--panel-deep)] px-6 font-display text-[15px] text-[var(--panel-deep-text)] transition-opacity hover:opacity-90"
          >
            <Icon name="camera" className="h-[17px] w-[17px]" />
            Watch Stories Reviews
          </Link>
          <div className="flex flex-wrap justify-center gap-2.5">
            {EXTERNAL_REVIEW_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-color)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
              >
                <Icon name={link.icon} filled={link.filled} className="h-4 w-4" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
