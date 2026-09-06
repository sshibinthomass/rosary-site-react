import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import Icon from '../components/Icon';
import {
  DeepPanel,
  EmptyState,
  ListRow,
  RoundButton,
  WhatsAppButton,
} from '../components/storefront';
import { useToast } from '../context/ToastContext';
import { buildPlantHelpMessage, buildWhatsAppLink } from '../utils/nurseryMessages';
import { getProducts } from '../services/productService';
import {
  GUIDES_INDEX_PATH,
  buildContentHubSchemaItems,
  getContentHubBySlug,
  getContentHubCanonicalUrl,
  getContentHubImage,
  getContentHubImageAlt,
  getContentHubPath,
  getContentHubProducts,
  getContentHubTopicLabel,
  getRelatedContentHubs,
  estimateContentHubReadMinutes,
} from '../utils/contentHubs';
import {
  getPrimaryProductImage,
  getProductPath,
  getProductPrice,
} from '../utils/productSeo';
import { getStorefrontProductTitle } from '../utils/productPresentation';

/** Stable anchor id for a section heading. */
function getSectionId(heading) {
  return `section-${String(heading || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
}

function ProductTile({ product }) {
  const price = getProductPrice(product);
  const title = getStorefrontProductTitle(product);

  return (
    <Link to={getProductPath(product)} className="w-[126px] shrink-0">
      <img
        src={getPrimaryProductImage(product)}
        alt={title}
        loading="lazy"
        className="washed h-[126px] w-[126px] rounded-[20px] object-cover"
        onError={(event) => {
          event.currentTarget.src = '/placeholder-plant.jpg';
        }}
      />
      <p className="mt-2 line-clamp-2 font-display text-sm leading-tight text-[var(--text-primary)]">{title}</p>
      {price !== null && (
        <p className="mt-1 text-[13px] font-bold text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]">
          ₹{price.toLocaleString('en-IN')}
        </p>
      )}
    </Link>
  );
}

export default function ContentHubPage() {
  const { hubSlug } = useParams();
  const hub = getContentHubBySlug(hubSlug);
  const navigate = useNavigate();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const data = await getProducts(null);
        if (active) setProducts(data || []);
      } catch (error) {
        console.warn('Could not load guide product recommendations:', error);
        if (active) setProducts([]);
      } finally {
        if (active) setLoadingProducts(false);
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const matchedProducts = useMemo(() => (
    hub ? getContentHubProducts(hub, products, { limit: 8 }) : []
  ), [hub, products]);

  const schemaData = useMemo(() => (
    hub ? buildContentHubSchemaItems(hub, { products: matchedProducts }) : null
  ), [hub, matchedProducts]);

  if (!hub) {
    return (
      <div className="mx-auto max-w-3xl pb-16">
        <SEO
          title="Guide Not Found"
          description="The requested Rosary Plant House plant care guide was not found."
          canonicalUrl="https://rosaryplanthouse.com/404"
          noindex
        />
        <EmptyState
          icon="book"
          title="Guide not found"
          description="This plant care guide does not exist or may have moved."
        >
          <Link to={GUIDES_INDEX_PATH} className="btn btn-primary">Browse care guides</Link>
        </EmptyState>
      </div>
    );
  }

  const relatedHubs = getRelatedContentHubs(hub);
  const guideImage = getContentHubImage(hub);
  const guideImageAlt = getContentHubImageAlt(hub);
  const topicLabel = getContentHubTopicLabel(hub);
  const readMinutes = estimateContentHubReadMinutes(hub);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(GUIDES_INDEX_PATH);
  };

  const shareGuide = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: hub.title, text: hub.metaDescription, url });
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Guide link copied');
    } catch {
      toast.error('Could not copy the link. Copy it from the address bar.');
    }
  };

  return (
    <div className="animate-fade-in mx-auto max-w-3xl pb-16">
      <SEO
        title={hub.title}
        description={hub.metaDescription}
        image={guideImage}
        canonicalUrl={getContentHubCanonicalUrl(hub)}
        schemaData={schemaData}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <RoundButton icon="arrow-left" label="Go back" onClick={goBack} />
        <nav aria-label="Breadcrumb" className="min-w-0 truncate text-center text-xs text-[var(--text-secondary)]">
          <Link to={GUIDES_INDEX_PATH} className="hover:text-[var(--text-primary)]">Care guides</Link>
          <span className="mx-1.5">·</span>
          <span>{topicLabel}</span>
        </nav>
        <RoundButton icon="share" label="Share this guide" onClick={shareGuide} />
      </div>

      <article>
        <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]">
          {topicLabel} · {readMinutes} min read
        </p>
        <h1 className="mt-2 font-display text-[29px] leading-tight text-[var(--text-primary)]">{hub.h1}</h1>
        <p className="mt-3 text-[13px] text-[var(--text-secondary)]">Written by the nursery</p>

        <div className="mt-4 overflow-hidden rounded-[28px]">
          <img src={guideImage} alt={guideImageAlt} className="washed h-[210px] w-full object-cover" />
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">{hub.intro}</p>

        <section className="mt-4 rounded-[28px] bg-[var(--color-accent-200)] p-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--color-accent-700)]">
            Short answer
          </p>
          <p className="text-[15px] leading-relaxed text-[var(--color-accent-900)]">{hub.answer}</p>
        </section>

        <nav className="mt-4 rounded-[24px] bg-[var(--bg-secondary)] px-[18px] py-4" aria-label="In this guide">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--text-secondary)]">
            In this guide
          </p>
          <ol className="flex flex-col gap-2">
            {hub.sections.map((section, index) => (
              <li key={section.heading}>
                <a
                  href={`#${getSectionId(section.heading)}`}
                  className="text-sm font-semibold text-[var(--color-accent-700)] hover:underline dark:text-[var(--color-accent-300)]"
                >
                  {index + 1}. {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {hub.sections.map((section, index) => (
          <section key={section.heading} id={getSectionId(section.heading)} className="mt-7 scroll-mt-24">
            <h2 className="mb-2.5 font-display text-[21px] leading-tight text-[var(--text-primary)]">
              {index + 1}. {section.heading}
            </h2>
            {(section.body || []).map((paragraph) => (
              <p key={paragraph} className="mb-3.5 text-[15px] leading-[1.7] text-[var(--text-secondary)]">
                {paragraph}
              </p>
            ))}
            {Array.isArray(section.bullets) && section.bullets.length > 0 && (
              <ul className="flex flex-col gap-2">
                {section.bullets.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-[18px] bg-[var(--color-sage-200)] px-3.5 py-3"
                  >
                    <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--color-sage-600)] text-[#f9f4ed]">
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[13px] leading-snug text-[var(--color-sage-900)]">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="mt-8">
          <h2 className="mb-3 font-display text-[21px] text-[var(--text-primary)]">Common questions</h2>
          <div className="flex flex-col gap-2">
            {hub.faqs.map((faq) => (
              <details key={faq.question} className="group rounded-[24px] bg-[var(--bg-secondary)] px-[18px] py-4" open>
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold text-[var(--text-primary)]">
                  {faq.question}
                  <Icon
                    name="chevron-down"
                    className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-2.5 text-[14px] leading-relaxed text-[var(--text-secondary)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </article>

      <DeepPanel title="Still not sure?" className="mt-8">
        <p className="mb-4 text-[13px] leading-relaxed text-[var(--panel-deep-muted)]">
          Send a photo of the plant and the pot. We will tell you what it needs and what to leave alone.
        </p>
        <WhatsAppButton href={buildWhatsAppLink(buildPlantHelpMessage())}>Ask on WhatsApp</WhatsAppButton>
      </DeepPanel>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-[20px] text-[var(--text-primary)]">Recommended plants</h2>

        {loadingProducts ? (
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="w-[126px] shrink-0 animate-pulse">
                <div className="h-[126px] w-[126px] rounded-[20px] bg-[var(--bg-tertiary)]" />
                <div className="mt-2 h-3.5 w-4/5 rounded bg-[var(--bg-tertiary)]" />
                <div className="mt-2 h-3 w-1/2 rounded bg-[var(--bg-tertiary)]" />
              </div>
            ))}
          </div>
        ) : matchedProducts.length > 0 ? (
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {matchedProducts.map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] bg-[var(--bg-secondary)] px-5 py-4">
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Nothing from this guide is on the bench right now. The full catalogue shows what we have today.
            </p>
            <Link to="/shop" className="mt-3 inline-flex text-sm font-semibold text-[var(--color-accent-700)] hover:underline dark:text-[var(--color-accent-300)]">
              Browse plants
            </Link>
          </div>
        )}
      </section>

      {relatedHubs.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-[20px] text-[var(--text-primary)]">Related guides</h2>
          <div className="flex flex-col gap-2">
            {relatedHubs.map((relatedHub) => (
              <ListRow
                key={relatedHub.slug}
                icon="book"
                title={relatedHub.title}
                subtitle={relatedHub.metaDescription}
                to={getContentHubPath(relatedHub)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
