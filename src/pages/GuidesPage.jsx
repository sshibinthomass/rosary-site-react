import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import {
  CONTENT_HUBS,
  getContentHubCanonicalUrl,
  getContentHubImage,
  getContentHubImageAlt,
  getContentHubPath,
  getGuidesIndexCanonicalUrl,
} from '../utils/contentHubs';

const guidesIndexSchema = [
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Plant Care Guides',
    description: 'Plant care guides for succulents, cactus, balcony plants, monsoon care and root rot recovery from Rosary Plant House.',
    url: getGuidesIndexCanonicalUrl(),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Rosary Plant House plant care guides',
    itemListElement: CONTENT_HUBS.map((hub, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: hub.title,
      url: getContentHubCanonicalUrl(hub),
    })),
  },
];

export default function GuidesPage() {
  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-16">
      <SEO
        title="Plant Care Guides"
        description="Browse plant care guides from Rosary Plant House for succulents, cactus, balcony plants, monsoon care and root rot recovery in India."
        image={getContentHubImage(CONTENT_HUBS[0])}
        canonicalUrl={getGuidesIndexCanonicalUrl()}
        schemaData={guidesIndexSchema}
      />

      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-forest)]">Care library</p>
        <h1 className="mt-3 text-3xl md:text-5xl font-bold leading-tight text-[var(--text-primary)]">
          Plant Care Guides
        </h1>
        <p className="mt-4 max-w-3xl text-base md:text-lg leading-8 text-[var(--text-secondary)]">
          Practical Rosary Plant House guides for choosing, growing and recovering succulents, cactus and low water plants in Indian homes.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {CONTENT_HUBS.map((hub) => (
          <Link
            key={hub.slug}
            to={getContentHubPath(hub)}
            className="group overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--color-forest)] transition-all"
          >
            <div className="aspect-[3/2] overflow-hidden bg-[var(--bg-tertiary)]">
              <img
                src={getContentHubImage(hub)}
                alt={getContentHubImageAlt(hub)}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-forest)]">Guide</p>
              <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">{hub.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{hub.metaDescription}</p>
              <span className="mt-4 inline-flex text-sm font-semibold text-[var(--color-forest)]">
                Read guide
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
