import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import reviewsData from '../data/reviews.json';
import SEO from '../components/SEO';
import Icon, { GoogleMark } from '../components/Icon';
import { ChipRail, DeepPanel, PageBar } from '../components/storefront';

const GOOGLE_REVIEWS_URL = 'https://maps.app.goo.gl/h5ziUGAuvC4FZZqn8';
const FACEBOOK_REVIEWS_URL = 'https://www.facebook.com/rosaryplanthouse/reviews';
const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/rosary_plant_house';

/** The only qualifier the review data can honestly support. */
const REPEAT_BUYER_PATTERN = /\b(second|third|fourth|2nd|3rd|4th|repeat|again|another order|every time|each time|regular customer|many times|multiple times|order more|ordered more)\b/i;

const reviewEntries = reviewsData.map((review, index) => ({
  id: `${index}-${review.author}`,
  review,
  repeatBuyer: REPEAT_BUYER_PATTERN.test(review.text || ''),
  hasPhotos: Array.isArray(review.images) && review.images.length > 0,
}));

const averageRating = reviewsData.reduce((total, review) => total + review.rating, 0) / reviewsData.length;
const allFiveStars = reviewsData.every((review) => review.rating === 5);
const roundedCount = Math.floor(reviewsData.length / 10) * 10;

const reviewSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Rosary Plant House Shopping Experience",
  "image": "https://rosaryplanthouse.com/hero-bg.jpg",
  "description": "Customer reviews and feedback for Rosary Plant House, Coonoor.",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": averageRating.toFixed(1),
    "reviewCount": reviewsData.length
  },
  "review": reviewsData.map(rev => ({
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": rev.author
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": rev.rating,
      "bestRating": "5"
    },
    "reviewBody": rev.text
  }))
};

function StarRow({ className = '' }) {
  return (
    <div className={`flex gap-0.5 ${className}`}>
      {[...Array(5)].map((_, index) => (
        <Icon key={index} name="star" filled className="h-[13px] w-[13px]" />
      ))}
    </div>
  );
}

function ReviewCard({ entry }) {
  const { review, repeatBuyer } = entry;

  return (
    <article className="rounded-[24px] bg-[var(--bg-secondary)] p-[18px]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--color-sage-200)] font-display text-[15px] text-[var(--color-sage-800)]">
            {review.author.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--text-primary)]">{review.author}</p>
            {repeatBuyer && <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">Repeat customer</p>}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-sage-200)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-sage-800)]">
          <Icon name="star" filled className="h-[11px] w-[11px]" />
          {review.rating.toFixed(1)}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">&ldquo;{review.text}&rdquo;</p>

      {entry.hasPhotos && (
        <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {review.images.map((image, index) => (
            <img
              key={image}
              src={image}
              alt={`Photo ${index + 1} from ${review.author}`}
              loading="lazy"
              className="washed h-24 w-24 shrink-0 rounded-[18px] object-cover"
            />
          ))}
        </div>
      )}

      {review.link && (
        <a
          href={review.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex text-sm font-semibold text-[var(--color-accent-700)] hover:underline dark:text-[var(--color-accent-300)]"
        >
          View full review
        </a>
      )}
    </article>
  );
}

export default function ReviewsPage() {
  const location = useLocation();
  const [filter, setFilter] = useState('all');

  const photoCount = reviewEntries.filter((entry) => entry.hasPhotos).length;
  const repeatCount = reviewEntries.filter((entry) => entry.repeatBuyer).length;

  const filterChips = [
    { id: 'all', label: 'All', count: reviewEntries.length },
    ...(repeatCount > 0 ? [{ id: 'repeat', label: 'Repeat buyers', count: repeatCount }] : []),
    ...(photoCount > 0 ? [{ id: 'photos', label: 'With photos', count: photoCount }] : []),
  ];

  const visibleReviews = useMemo(() => reviewEntries.filter((entry) => {
    if (filter === 'repeat') return entry.repeatBuyer;
    if (filter === 'photos') return entry.hasPhotos;
    return true;
  }), [filter]);

  return (
    <div className="animate-fade-in mx-auto max-w-3xl pb-16">
      <SEO
        title="Customer Reviews"
        description="Read what our plant lovers say about Rosary Plant House. 5-star rated nursery from Coonoor, Nilgiris packing rare succulents for safety."
        canonicalUrl="https://rosaryplanthouse.com/reviews"
        schemaData={reviewSchema}
      />

      <PageBar title="Reviews" />

      <DeepPanel>
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <p className="font-display text-[42px] leading-none text-[var(--panel-deep-text)]">
              {averageRating.toFixed(1)}
            </p>
            <StarRow className="mt-1 text-[var(--color-accent-400)]" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[20px] leading-tight text-[var(--panel-deep-text)]">
              {roundedCount > 0 ? `${roundedCount}+` : reviewEntries.length} reviews
              {allFiveStars ? ', all five stars' : `, ${averageRating.toFixed(1)} average`}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--panel-deep-muted)]">
              From Google, Instagram and Facebook. Repeat buyers since 2020.
            </p>
          </div>
        </div>
      </DeepPanel>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to="/insta-reviews"
          state={{ from: location.pathname }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-terracotta)] px-5 font-display text-[15px] text-[#f5ead8] transition-opacity hover:opacity-90 dark:text-[#201e1d]"
        >
          <Icon name="instagram" className="h-[17px] w-[17px]" />
          Watch story reviews
        </Link>
        <a
          href={GOOGLE_REVIEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-color)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
        >
          <GoogleMark className="h-4 w-4" />
          Google
        </a>
        <a
          href={INSTAGRAM_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-color)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
        >
          <Icon name="instagram" className="h-4 w-4" />
          Instagram
        </a>
        <a
          href={FACEBOOK_REVIEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-color)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
        >
          <Icon name="facebook" filled className="h-4 w-4 text-[#1877F2]" />
          Facebook
        </a>
      </div>

      {filterChips.length > 1 && (
        <ChipRail
          className="mt-3"
          options={filterChips}
          value={filter}
          onChange={setFilter}
          ariaLabel="Filter reviews"
        />
      )}

      <div className="mt-4 flex flex-col gap-3">
        {visibleReviews.map((entry) => (
          <ReviewCard key={entry.id} entry={entry} />
        ))}
      </div>

      <section className="mt-6 rounded-[24px] bg-[var(--bg-secondary)] px-5 py-[18px]">
        <h2 className="mb-1.5 font-display text-[18px] text-[var(--text-primary)]">Bought from us before?</h2>
        <p className="mb-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          Post a story of your plants and tag us, and we will add a complimentary plant to your next order.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-terracotta)] px-[17px] font-display text-sm text-[#f5ead8] transition-opacity hover:opacity-90 dark:text-[#201e1d]"
          >
            Leave a review
          </a>
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-color)] px-[17px] text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
          >
            <GoogleMark className="h-4 w-4" />
            See on Google
          </a>
        </div>
      </section>
    </div>
  );
}
