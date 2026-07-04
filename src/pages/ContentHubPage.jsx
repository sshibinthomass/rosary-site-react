import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
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
  getRelatedContentHubs,
} from '../utils/contentHubs';
import {
  getPrimaryProductImage,
  getProductDisplayName,
  getProductPath,
  getProductPrice,
} from '../utils/productSeo';

function ProductSuggestion({ product }) {
  const price = getProductPrice(product);

  return (
    <Link
      to={getProductPath(product)}
      className="card group overflow-hidden hover:border-[var(--color-forest)] transition-all"
    >
      <div className="aspect-[4/3] bg-[var(--bg-tertiary)] overflow-hidden">
        <img
          src={getPrimaryProductImage(product)}
          alt={getProductDisplayName(product)}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(event) => {
            event.currentTarget.src = '/placeholder-plant.jpg';
          }}
        />
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">{product.category || 'Plant'}</p>
        <h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
          {getProductDisplayName(product)}
        </h3>
        {price !== null && (
          <p className="mt-2 text-sm font-semibold text-[var(--color-forest)]">Rs. {price.toLocaleString('en-IN')}</p>
        )}
      </div>
    </Link>
  );
}

export default function ContentHubPage() {
  const { hubSlug } = useParams();
  const hub = getContentHubBySlug(hubSlug);
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
      <div className="max-w-3xl mx-auto py-16 text-center">
        <SEO
          title="Guide Not Found"
          description="The requested Rosary Plant House plant care guide was not found."
          canonicalUrl="https://rosaryplanthouse.com/404"
          noindex
        />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Guide not found</h1>
        <p className="mt-3 text-[var(--text-secondary)]">This plant care guide does not exist or may have moved.</p>
        <Link
          to={GUIDES_INDEX_PATH}
          className="inline-flex mt-6 px-5 py-2.5 rounded-lg bg-[var(--color-forest)] text-white font-medium"
        >
          Browse care guides
        </Link>
      </div>
    );
  }

  const relatedHubs = getRelatedContentHubs(hub);
  const guideImage = getContentHubImage(hub);
  const guideImageAlt = getContentHubImageAlt(hub);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-16">
      <SEO
        title={hub.title}
        description={hub.metaDescription}
        image={guideImage}
        canonicalUrl={getContentHubCanonicalUrl(hub)}
        schemaData={schemaData}
      />

      <nav className="text-sm text-[var(--text-secondary)] mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[var(--text-primary)]">Home</Link>
        <span className="mx-2">/</span>
        <Link to={GUIDES_INDEX_PATH} className="hover:text-[var(--text-primary)]">Guides</Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--text-primary)]">{hub.title}</span>
      </nav>

      <article className="space-y-8">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-forest)]">Plant care guide</p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight text-[var(--text-primary)]">{hub.h1}</h1>
          <p className="text-base md:text-lg leading-8 text-[var(--text-secondary)]">{hub.intro}</p>
        </header>

        <figure className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <img
            src={guideImage}
            alt={guideImageAlt}
            className="aspect-[3/2] w-full object-cover"
          />
        </figure>

        <section className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Quick answer</h2>
          <p className="mt-3 leading-7 text-[var(--text-secondary)]">{hub.answer}</p>
        </section>

        {hub.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{section.heading}</h2>
            {(section.body || []).map((paragraph) => (
              <p key={paragraph} className="leading-7 text-[var(--text-secondary)]">{paragraph}</p>
            ))}
            {Array.isArray(section.bullets) && section.bullets.length > 0 && (
              <ul className="grid gap-2 pl-5 list-disc text-[var(--text-secondary)]">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Common questions</h2>
          <div className="divide-y divide-[var(--border-color)] rounded-lg border border-[var(--border-color)] overflow-hidden">
            {hub.faqs.map((faq) => (
              <details key={faq.question} className="group bg-[var(--bg-primary)] p-4" open>
                <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">{faq.question}</summary>
                <p className="mt-3 leading-7 text-[var(--text-secondary)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </article>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Recommended plants</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Relevant live plant pages from the catalogue.</p>
          </div>
          <Link to="/" className="hidden sm:inline-flex text-sm font-medium text-[var(--color-forest)] hover:underline">
            View all plants
          </Link>
        </div>

        {loadingProducts ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="card overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-[var(--bg-tertiary)]" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
                  <div className="h-4 bg-[var(--bg-tertiary)] rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : matchedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {matchedProducts.map((product) => (
              <ProductSuggestion key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
            <p className="text-[var(--text-secondary)]">Browse the full catalogue to find currently available plants for this guide.</p>
            <Link to="/" className="inline-flex mt-4 text-sm font-medium text-[var(--color-forest)] hover:underline">
              Browse plants
            </Link>
          </div>
        )}
      </section>

      {relatedHubs.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Related guides</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {relatedHubs.map((relatedHub) => (
              <Link
                key={relatedHub.slug}
                to={getContentHubPath(relatedHub)}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 hover:border-[var(--color-forest)] transition-colors"
              >
                <h3 className="font-semibold text-[var(--text-primary)]">{relatedHub.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{relatedHub.metaDescription}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
