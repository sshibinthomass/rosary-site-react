import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import Icon from '../components/Icon';
import {
  ChipRail,
  DeepPanel,
  EmptyState,
  PageBar,
  PhotoBanner,
  WhatsAppButton,
} from '../components/storefront';
import { buildPlantAdviceMessage, buildPlantHelpMessage, buildWhatsAppLink } from '../utils/nurseryMessages';
import {
  CONTENT_HUBS,
  getContentHubCanonicalUrl,
  getContentHubImage,
  getContentHubImageAlt,
  getContentHubPath,
  getGuidesIndexCanonicalUrl,
  GUIDE_TOPICS,
  getContentHubTopics,
  estimateContentHubReadMinutes,
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

const GUIDE_ENTRIES = CONTENT_HUBS.map((hub) => {
  const topics = getContentHubTopics(hub);
  return {
    hub,
    topicIds: topics.map((topic) => topic.id),
    topicLabel: topics[0]?.label || 'Care guide',
    minutes: estimateContentHubReadMinutes(hub),
    searchText: [
      hub.title,
      hub.metaDescription,
      hub.intro,
      ...(hub.sections || []).map((section) => section.heading),
    ].join(' ').toLowerCase(),
  };
});

const TOPIC_CHIPS = [
  { id: 'all', label: 'All' },
  ...GUIDE_TOPICS
    .filter((topic) => GUIDE_ENTRIES.some((entry) => entry.topicIds.includes(topic.id)))
    .map((topic) => ({ id: topic.id, label: topic.label })),
];

function GuideRow({ entry }) {
  const { hub, topicLabel, minutes } = entry;

  return (
    <Link
      to={getContentHubPath(hub)}
      className="flex items-center gap-3.5 rounded-[24px] bg-[var(--bg-secondary)] p-3 transition-colors hover:bg-[var(--bg-tertiary)]"
    >
      <img
        src={getContentHubImage(hub)}
        alt={getContentHubImageAlt(hub)}
        loading="lazy"
        className="washed h-[78px] w-[78px] shrink-0 rounded-[18px] object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]">
          {topicLabel}
        </p>
        <h3 className="font-display text-base leading-tight text-[var(--text-primary)]">{hub.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-[var(--text-secondary)]">{hub.metaDescription}</p>
        <p className="mt-1.5 text-[11px] font-bold text-[var(--color-sage-700)] dark:text-[var(--color-sage-400)]">
          {minutes} min read
        </p>
      </div>
      <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
    </Link>
  );
}

export default function GuidesPage() {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');

  const trimmedQuery = query.trim().toLowerCase();
  const isFiltered = trimmedQuery !== '' || topic !== 'all';

  const results = useMemo(() => GUIDE_ENTRIES.filter((entry) => {
    if (topic !== 'all' && !entry.topicIds.includes(topic)) return false;
    if (!trimmedQuery) return true;
    return entry.searchText.includes(trimmedQuery);
  }), [topic, trimmedQuery]);

  const featured = isFiltered ? null : results[0];
  const rows = isFiltered ? results : results.slice(1);

  return (
    <div className="animate-fade-in mx-auto max-w-3xl pb-16">
      <SEO
        title="Plant Care Guides"
        description="Browse plant care guides from Rosary Plant House for succulents, cactus, balcony plants, monsoon care and root rot recovery in India."
        image={getContentHubImage(CONTENT_HUBS[0])}
        canonicalUrl={getGuidesIndexCanonicalUrl()}
        schemaData={guidesIndexSchema}
      />

      <PageBar title="Care guides" asHeading={false} />

      <h1 className="font-display text-[27px] leading-tight text-[var(--text-primary)]">
        Grown here, so the advice fits here
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        Written for Indian homes and Indian weather — humidity, monsoon and balcony sun, not a European greenhouse.
      </p>

      <div className="relative mt-4">
        <Icon
          name="search"
          className="pointer-events-none absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the guides"
          aria-label="Search the guides"
          className="min-h-11 w-full rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--color-terracotta)]"
        />
      </div>

      <ChipRail
        className="mt-3"
        options={TOPIC_CHIPS}
        value={topic}
        onChange={setTopic}
        ariaLabel="Filter guides by topic"
      />

      {results.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="search"
            title="No guide covers that yet"
            description="Try a simpler word, or ask us directly — we grew these plants, so we can usually answer straight away."
          >
            <WhatsAppButton
              href={buildWhatsAppLink(buildPlantAdviceMessage({ query: query.trim() }))}
              tone="accent"
            >
              Ask the nursery
            </WhatsAppButton>
          </EmptyState>
        </div>
      ) : (
        <>
          {featured && (
            <Link to={getContentHubPath(featured.hub)} className="mt-4 block">
              <PhotoBanner
                src={getContentHubImage(featured.hub)}
                alt={getContentHubImageAlt(featured.hub)}
                eyebrow="Start here"
                title={featured.hub.title}
                description={`${featured.minutes} min read`}
              />
            </Link>
          )}

          <div className="mt-3 flex flex-col gap-2.5">
            {rows.map((entry) => (
              <GuideRow key={entry.hub.slug} entry={entry} />
            ))}
          </div>
        </>
      )}

      <DeepPanel title="Your plant looks unwell?" className="mt-6">
        <p className="mb-4 text-[13px] leading-relaxed text-[var(--panel-deep-muted)]">
          Send us a photo. We grew it, so we can usually tell you what happened and how to save it.
        </p>
        <WhatsAppButton href={buildWhatsAppLink(buildPlantHelpMessage())}>Ask on WhatsApp</WhatsAppButton>
      </DeepPanel>
    </div>
  );
}
