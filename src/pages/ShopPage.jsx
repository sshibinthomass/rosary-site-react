import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
import Icon from '../components/Icon';
import { ChipRail, EmptyState, PhotoBanner, StickyBar, WhatsAppButton } from '../components/storefront';
import { CATEGORIES, CURRENCY, FREE_PLANT_THRESHOLD } from '../config/constants';
import { useCart } from '../context/CartContext';
import { CATALOG_REFRESH_EVENT } from '../utils/catalogRefresh';
import { buildPlantAdviceMessage, buildWhatsAppLink } from '../utils/nurseryMessages';
import { getStorefrontProductTitle } from '../utils/productPresentation';
import { matchesShopSearch } from '../utils/shopSearch';
import { mergeProductWithLocalEnrichment } from '../utils/productSeo';

const BATCH_SIZE = 24;
const SMART_SEARCH_EXAMPLES = Object.freeze([
  'low water',
  'low light',
  'flowering',
  'cactus',
  'under 60',
]);
const SEARCH_PLACEHOLDER = 'Search plants by name, category, care need, or budget...';
const TYPEWRITER_HINT_DELAYS = Object.freeze({
  type: 80,
  hold: 1000,
  delete: 40,
  next: 240,
});
const SHOP_CATEGORY_BACKGROUNDS = Object.freeze({
  'All': '/shop/category-backgrounds/all.jpg',
  'Limited': '/shop/category-backgrounds/limited.jpg',
  'Succulent': '/shop/category-backgrounds/succulent.jpg',
  'Cactus': '/shop/category-backgrounds/cactus.jpg',
  'Echeveria': '/shop/category-backgrounds/echeveria.jpg',
  'Jade': '/shop/category-backgrounds/jade.jpg',
  'Crassula': '/shop/category-backgrounds/crassula.jpg',
  'Peperomia': '/shop/category-backgrounds/peperomia.jpg',
  'Aloe': '/shop/category-backgrounds/aloe.jpg',
  'Sedum': '/shop/category-backgrounds/sedum.jpg',
  'Haworthia': '/shop/category-backgrounds/haworthia.jpg',
  'Creeper': '/shop/category-backgrounds/creeper.jpg',
  'Sansevieria': '/shop/category-backgrounds/sansevieria.jpg',
  'Indoor': '/shop/category-backgrounds/indoor.jpg',
  'Hanging': '/shop/category-backgrounds/hanging.jpg',
  'Mother': '/shop/category-backgrounds/mother.jpg',
  'Combo': '/shop/category-backgrounds/combo.jpg',
  'Others': '/shop/category-backgrounds/others.jpg',
});

/** Sort orders offered by the dropdown next to the result count. The first is the default. */
const SORT_OPTIONS = Object.freeze([
  { id: 'oldest', label: 'Oldest first' },
  { id: 'newest', label: 'Newest first' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'name-asc', label: 'Name A–Z' },
]);

/**
 * Quick filter chips. Each one delegates to the shop search parser so the chip
 * and the equivalent typed query can never drift apart.
 */
const QUICK_FILTERS = Object.freeze([
  { id: 'under-60', label: `Under ${CURRENCY}60`, query: 'under 60' },
  { id: 'under-100', label: `Under ${CURRENCY}100`, query: 'under 100' },
  { id: 'low-water', label: 'Low water', query: 'low water' },
  { id: 'low-light', label: 'Low light', query: 'low light' },
  { id: 'direct-sun', label: 'Direct sun', query: 'direct sun' },
  { id: 'beginner', label: 'Beginner', query: 'beginner' },
]);

/** Searches offered when a query returns nothing. */
const NO_RESULT_SUGGESTIONS = Object.freeze([
  'Low water',
  'Echeveria',
  `Under ${CURRENCY}60`,
  'Indoor',
  'Flowering',
]);

let productServicePromise = null;
let limitedServicePromise = null;

function loadProductService() {
  if (!productServicePromise) {
    productServicePromise = import('../services/productService');
  }

  return productServicePromise;
}

function loadLimitedService() {
  if (!limitedServicePromise) {
    limitedServicePromise = import('../services/limitedService');
  }

  return limitedServicePromise;
}

/** Out of stock plants stay hidden everywhere on the storefront. */
function isProductInStock(product) {
  return product.available !== false && (product.qtyAvailable !== 'NA' || product.inStock);
}

/** Limited plants carry ids like "L12", so sort on the numeric part only. */
function getSortableProductId(product) {
  const digits = String(product?.id ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

function getSortablePrice(product) {
  const price = Number(product?.salesPrice || product?.price);
  return Number.isFinite(price) ? price : 0;
}

function sortProducts(products, sortId) {
  const sorted = [...products];

  if (sortId === 'price-asc') {
    return sorted.sort((a, b) => getSortablePrice(a) - getSortablePrice(b));
  }
  if (sortId === 'price-desc') {
    return sorted.sort((a, b) => getSortablePrice(b) - getSortablePrice(a));
  }
  if (sortId === 'name-asc') {
    return sorted.sort((a, b) => getStorefrontProductTitle(a).localeCompare(getStorefrontProductTitle(b)));
  }
  // Ids climb as plants reach the bench, so the highest id is the newest plant.
  if (sortId === 'newest') {
    return sorted.sort((a, b) => getSortableProductId(b) - getSortableProductId(a));
  }

  // 'oldest', the default: plant #1 upwards.
  return sorted.sort((a, b) => getSortableProductId(a) - getSortableProductId(b));
}

export default function ShopPage() {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cart, cartCount, cartTotal } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const urlSearchQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQueryValue] = useState(urlSearchQuery);
  const [quickFilterId, setQuickFilterId] = useState('all');
  const [sortId, setSortId] = useState(SORT_OPTIONS[0].id);

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef(null);
  const searchEnrichmentPromiseRef = useRef(null);
  const [searchEnrichmentById, setSearchEnrichmentById] = useState(null);
  const [typewriterHint, setTypewriterHint] = useState({ index: 0, charCount: 0, deleting: false });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Determine selected category from URL or default to 'All'
  const selectedCategory = categoryName || 'All';
  const isCategoryPage = selectedCategory !== 'All';
  const shopCanonicalUrl = isCategoryPage
    ? `https://rosaryplanthouse.com/category/${encodeURIComponent(selectedCategory)}`
    : 'https://rosaryplanthouse.com/shop';
  const shopSeoTitle = isCategoryPage ? `${selectedCategory} Plants` : 'Shop Plants';
  const shopDescription = isCategoryPage
    ? `Browse current ${selectedCategory} plants available from Rosary Plant House.`
    : 'Search current succulents, cacti, indoor plants and limited drops from Rosary Plant House.';
  const shopHeroBackground = SHOP_CATEGORY_BACKGROUNDS[selectedCategory] || SHOP_CATEGORY_BACKGROUNDS['Others'];
  // Painted behind the band so the photograph is there before the lazy image decodes.
  const shopHeroStyle = {
    backgroundImage: `url(${shopHeroBackground})`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
  };
  const activeTypewriterExample = SMART_SEARCH_EXAMPLES[typewriterHint.index] || SMART_SEARCH_EXAMPLES[0];
  const animatedSearchPlaceholder = searchQuery.trim()
    ? SEARCH_PLACEHOLDER
    : prefersReducedMotion
      ? `Try ${SMART_SEARCH_EXAMPLES[0]}`
      : `Try ${activeTypewriterExample.slice(0, typewriterHint.charCount)}|`;

  // The typed search lives in ?q= so the home page spot rows can link straight to a result list.
  const setSearchQuery = useCallback((value) => {
    const nextQuery = typeof value === 'string' ? value : '';
    setSearchQueryValue(nextQuery);
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      if (nextQuery.trim()) {
        nextParams.set('q', nextQuery);
      } else {
        nextParams.delete('q');
      }
      return nextParams;
    }, { replace: true, state: { preventScroll: true } });
  }, [setSearchParams]);

  useEffect(() => {
    setSearchQueryValue((currentQuery) => (currentQuery === urlSearchQuery ? currentQuery : urlSearchQuery));
  }, [urlSearchQuery]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedCategory === 'Limited') {
        const { getLimitedPlants } = await loadLimitedService();
        const limited = await getLimitedPlants();
        setProducts((limited || []).map((item) => ({
          ...item,
          category: item.category || 'Limited'
        })));
        return;
      }

      // The whole catalogue, in one cached read. A paged first fetch would come
      // back in Firestore's lexicographic id order ("99" before "313"), so it
      // can neither be sorted nor counted honestly, and the full list is needed
      // for search, filters and the result count anyway.
      if (selectedCategory !== 'All') {
        const { getProducts } = await loadProductService();
        const categoryProducts = await getProducts(selectedCategory);
        setProducts(categoryProducts || []);
        return;
      }

      const [{ getLimitedPlants }, { getProducts }] = await Promise.all([
        loadLimitedService(),
        loadProductService()
      ]);
      const [limited, normal] = await Promise.all([
        getLimitedPlants(),
        getProducts(null)
      ]);

      const limitedWithCategory = (limited || []).map((item) => ({
        ...item,
        category: item.category || 'Limited'
      }));

      setProducts([...limitedWithCategory, ...(normal || [])]);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const loadSearchEnrichment = useCallback(() => {
    if (searchEnrichmentById) return Promise.resolve(searchEnrichmentById);
    if (searchEnrichmentPromiseRef.current) return searchEnrichmentPromiseRef.current;
    if (typeof fetch !== 'function') return Promise.resolve(null);

    searchEnrichmentPromiseRef.current = fetch('/product-seo-index.json', { cache: 'force-cache' })
      .then((response) => (response.ok ? response.json() : []))
      .then((localProducts) => {
        const localProductsById = new Map(
          (Array.isArray(localProducts) ? localProducts : [])
            .filter((product) => product?.id)
            .map((product) => [String(product.id), product])
        );
        setSearchEnrichmentById(localProductsById);
        return localProductsById;
      })
      .catch((error) => {
        console.warn('Could not load local product search enrichment:', error);
        searchEnrichmentPromiseRef.current = null;
        return null;
      });

    return searchEnrichmentPromiseRef.current;
  }, [searchEnrichmentById]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleCatalogRefresh = () => {
      loadProducts();
    };

    window.addEventListener(CATALOG_REFRESH_EVENT, handleCatalogRefresh);
    return () => window.removeEventListener(CATALOG_REFRESH_EVENT, handleCatalogRefresh);
  }, [loadProducts]);

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
    if (typeof window === 'undefined' || prefersReducedMotion || searchQuery.trim()) return undefined;

    const delay = typewriterHint.deleting
      ? typewriterHint.charCount === 0
        ? TYPEWRITER_HINT_DELAYS.next
        : TYPEWRITER_HINT_DELAYS.delete
      : typewriterHint.charCount >= activeTypewriterExample.length
        ? TYPEWRITER_HINT_DELAYS.hold
        : TYPEWRITER_HINT_DELAYS.type;

    const timeoutId = window.setTimeout(() => {
      setTypewriterHint((previousHint) => {
        const previousExample = SMART_SEARCH_EXAMPLES[previousHint.index] || SMART_SEARCH_EXAMPLES[0];

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
          index: (previousHint.index + 1) % SMART_SEARCH_EXAMPLES.length,
          charCount: 0,
          deleting: false,
        };
      });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [activeTypewriterExample.length, prefersReducedMotion, searchQuery, typewriterHint]);

  // Load products when category changes
  useEffect(() => {
    let frameId = null;
    let timeoutId = null;
    let fallbackId = null;
    let started = false;
    let cancelled = false;

    const startLoadingProducts = () => {
      if (cancelled || started) return;
      started = true;
      loadProducts();
    };

    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      // Yield one frame so the shell paints first...
      frameId = window.requestAnimationFrame(() => {
        timeoutId = window.setTimeout(startLoadingProducts, 0);
      });
      // ...but a hidden or backgrounded tab never gets that frame, and the
      // catalogue would sit on skeletons until the tab came forward.
      fallbackId = window.setTimeout(startLoadingProducts, 200);
    } else {
      timeoutId = setTimeout(startLoadingProducts, 0);
    }

    setQuickFilterId('all');
    setVisibleCount(BATCH_SIZE);
    return () => {
      cancelled = true;
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (fallbackId !== null) window.clearTimeout(fallbackId);
    };
  }, [loadProducts]);

  const activeQuickFilter = QUICK_FILTERS.find((filter) => filter.id === quickFilterId) || null;

  useEffect(() => {
    if (searchEnrichmentById) return;
    if (searchQuery.trim().length < 2 && !activeQuickFilter) return;
    loadSearchEnrichment();
  }, [activeQuickFilter, loadSearchEnrichment, searchEnrichmentById, searchQuery]);

  const enrichProduct = useCallback((product) => {
    const localProduct = searchEnrichmentById?.get(String(product.id));
    return localProduct ? mergeProductWithLocalEnrichment(product, localProduct) : product;
  }, [searchEnrichmentById]);

  // Stock is the one filter that always applies.
  const stockedProducts = useMemo(() => products.filter(isProductInStock), [products]);

  const quickFilterQuery = activeQuickFilter?.query || '';
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim();
    if (!query && !quickFilterQuery) return stockedProducts;

    return stockedProducts.filter((product) => {
      const searchableProduct = enrichProduct(product);

      if (quickFilterQuery && !matchesShopSearch(searchableProduct, quickFilterQuery)) return false;
      if (!query) return true;

      const name = (
        searchableProduct.title ||
        searchableProduct.name ||
        searchableProduct.commonName ||
        searchableProduct.schema?.name ||
        ''
      ).toLowerCase();
      const category = (
        searchableProduct.category ||
        searchableProduct.careGuide?.siteCategory ||
        ''
      ).toLowerCase();
      const q = query.toLowerCase();

      return name.includes(q) || category.includes(q) || matchesShopSearch(searchableProduct, query);
    });
  }, [enrichProduct, quickFilterQuery, searchQuery, stockedProducts]);

  const sortedProducts = useMemo(() => sortProducts(filteredProducts, sortId), [filteredProducts, sortId]);

  const quickFilterOptions = useMemo(() => [
    { id: 'all', label: isCategoryPage ? `All ${selectedCategory}` : 'All plants' },
    ...QUICK_FILTERS.map((filter) => ({ id: filter.id, label: filter.label })),
  ], [isCategoryPage, selectedCategory]);

  // Categories stay reachable from the page itself, not only from the drawer.
  const categoryOptions = useMemo(
    () => ['All', 'Limited', ...CATEGORIES].map((category) => ({ id: category, label: category })),
    []
  );

  const handleCategoryClick = useCallback((category) => {
    if (category === 'All') {
      navigate('/shop', { state: { preventScroll: true } });
    } else {
      navigate(`/category/${encodeURIComponent(category)}`, { state: { preventScroll: true } });
    }
  }, [navigate]);

  // The band copy counts what is actually on the bench right now.
  const benchCount = stockedProducts.length;
  const benchLowestPrice = useMemo(() => stockedProducts.reduce((lowest, product) => {
    const price = getSortablePrice(product);
    if (price <= 0) return lowest;
    return lowest === null || price < lowest ? price : lowest;
  }, null), [stockedProducts]);
  const bandDescription = benchCount > 0 && benchLowestPrice !== null
    ? `${benchCount} plants on the bench today. All from ${CURRENCY}${benchLowestPrice.toLocaleString('en-IN')}.`
    : shopDescription;

  // Reset visible count when the visible set changes.
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [searchQuery, quickFilterId]);

  // Products to actually render (batched)
  const visibleProducts = useMemo(() => sortedProducts.slice(0, visibleCount), [sortedProducts, visibleCount]);
  const hasMore = visibleCount < sortedProducts.length;

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, sortedProducts.length));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, sortedProducts.length]);

  const homeSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Rosary Plant House",
    "image": "https://rosaryplanthouse.com/hero-bg.jpg",
    "description": "Buy rare succulents, cacti, and indoor plants online from Rosary Plant House, Coonoor, Nilgiris.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Samayapuram, Alwarpet",
      "addressLocality": "Coonoor, The Nilgiris",
      "addressRegion": "Tamil Nadu",
      "addressCountry": "IN"
    },
    "telephone": "+917904050237",
    "priceRange": "₹"
  };

  const hasCart = cart.length > 0;

  return (
    <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${hasCart ? 'pb-44' : 'pb-24'}`}>
      <SEO
        title={shopSeoTitle}
        description="Shop succulents, cacti, indoor plants and balcony plants from Rosary Plant House, Coonoor. Search and choose plants with safe packing and support."
        canonicalUrl={shopCanonicalUrl}
        schemaData={homeSchema}
      />

      {/* Category band */}
      <section className="pt-3">
        <div className="overflow-hidden rounded-[28px] bg-[var(--bg-tertiary)]" style={shopHeroStyle}>
          <PhotoBanner
            src={shopHeroBackground}
            alt={isCategoryPage ? `${selectedCategory} plants on the Rosary Plant House bench` : 'Plants on the Rosary Plant House bench'}
            height="h-[190px]"
          >
            <h1
              className="font-display text-[27px] leading-tight text-[#f9f4ed] sm:text-[30px]"
              aria-label={isCategoryPage ? `Shop ${selectedCategory} plants` : 'Shop live plants'}
            >
              {isCategoryPage ? selectedCategory : 'Shop live plants'}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-sage-200)]">
              {bandDescription}
            </p>
          </PhotoBanner>
        </div>

        {isCategoryPage && (
          <p className="mt-3 text-[13px] text-[var(--text-secondary)]">
            Browsing{' '}
            <strong className="font-extrabold text-[var(--color-forest)]">{selectedCategory}</strong>{' '}
            plants &mdash; every one lifted from our own bench.
          </p>
        )}

        <ChipRail
          className="mt-3"
          ariaLabel="Browse categories"
          options={categoryOptions}
          value={selectedCategory}
          onChange={handleCategoryClick}
        />
      </section>

      {/* Search */}
      <section className="pt-5">
        <div className="relative flex items-center">
          <Icon name="search" className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={animatedSearchPlaceholder}
            aria-label="Search plants by name or category, care need, or budget"
            className="input h-12 pl-11 pr-12 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Clear search"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]" aria-label="Smart search examples">
          <span className="font-bold text-[var(--text-primary)]">Try:</span>
          {SMART_SEARCH_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setSearchQuery(example)}
              className="chip"
            >
              {example}
            </button>
          ))}
        </div>
      </section>

      {/* Result line, sort and quick filters */}
      <section className="pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-[var(--text-secondary)]">
            {loading ? 'Counting the bench…' : `${sortedProducts.length} plants in stock`}
          </span>
          <div className="relative shrink-0">
            <Icon
              name="sliders"
              className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[var(--text-primary)]"
            />
            <select
              value={sortId}
              onChange={(event) => setSortId(event.target.value)}
              aria-label="Sort plants"
              className="min-h-11 w-full appearance-none rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] py-2 pl-[38px] pr-9 text-[13px] font-semibold text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--color-terracotta)] focus:border-[var(--color-terracotta)]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon
              name="chevron-down"
              className="pointer-events-none absolute right-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[var(--text-secondary)]"
            />
          </div>
        </div>

        <ChipRail
          className="mt-2.5"
          ariaLabel="Quick plant filters"
          options={quickFilterOptions}
          value={quickFilterId}
          onChange={setQuickFilterId}
        />
      </section>

      {/* Listing */}
      <section className="pt-5">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-soft flex flex-col">
                <div className="skeleton-shimmer aspect-[4/3] w-full" />
                <div className="flex flex-col gap-3.5 px-5 pb-5 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="skeleton-shimmer h-4 w-3/4 rounded-full" />
                      <div className="skeleton-shimmer h-3 w-1/3 rounded-full" />
                    </div>
                    <div className="skeleton-shimmer h-8 w-16 shrink-0 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <div className="skeleton-shimmer h-10 flex-1 rounded-2xl" />
                    <div className="skeleton-shimmer h-10 flex-1 rounded-2xl" />
                    <div className="skeleton-shimmer h-10 flex-1 rounded-2xl" />
                  </div>
                  <div className="skeleton-shimmer h-[46px] w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          searchQuery.trim() ? (
            /* No results dead end */
            <div className="flex flex-col items-center px-2 pt-6 text-center">
              <span className="mb-5 flex h-[92px] w-[92px] items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                <Icon name="search" className="h-10 w-10" strokeWidth={2} />
              </span>
              <h2 className="mb-2.5 font-display text-2xl text-[var(--text-primary)]">
                No plant called &ldquo;{searchQuery.trim()}&rdquo;
              </h2>
              <p className="mb-7 max-w-[320px] text-[15px] leading-relaxed text-[var(--text-secondary)]">
                We grow succulents and cacti, so tropical foliage is outside our bench. Try a name, a care need or a budget.
              </p>

              <div className="w-full max-w-md text-left">
                <p className="eyebrow mb-3">Try instead</p>
                <div className="flex flex-wrap gap-2">
                  {NO_RESULT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setSearchQuery(suggestion)}
                      className="chip"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel-deep mt-7 w-full max-w-md px-5 py-5 text-left">
                <p className="mb-2 font-display text-[18px] text-[var(--panel-deep-text)]">
                  Looking for something specific?
                </p>
                <p className="mb-4 text-[13px] leading-relaxed text-[var(--panel-deep-muted)]">
                  Ask us. If we do not grow it we will say so, and sometimes we have it on the bench before it reaches the site.
                </p>
                <WhatsAppButton href={buildWhatsAppLink(buildPlantAdviceMessage({ query: searchQuery.trim() }))}>
                  Ask the nursery
                </WhatsAppButton>
              </div>
            </div>
          ) : activeQuickFilter ? (
            <EmptyState
              icon="sliders"
              title={`Nothing is ${activeQuickFilter.label.toLowerCase()} today`}
              description="That filter has nothing on the bench right now. Clear it to see the whole list."
            >
              <button type="button" onClick={() => setQuickFilterId('all')} className="btn btn-accent">
                Show everything
              </button>
            </EmptyState>
          ) : (
            <EmptyState
              icon="sprout"
              title="This bench is empty"
              description="Everything here is off the bench right now. Browse the whole nursery, or check back in a few days."
            >
              <Link to="/shop" className="btn btn-accent">Browse all plants</Link>
            </EmptyState>
          )
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {visibleProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-[13px] text-[var(--text-secondary)]">
                  <Icon name="refresh" className="h-4 w-4 animate-spin" />
                  Loading more plants...
                </span>
              </div>
            )}
          </>
        )}
      </section>

      {/* Closing cards */}
      {sortedProducts.length > 0 && (
        <section className="mt-6 space-y-4">
          <div className="panel-deep px-5 py-6">
            <h2 className="mb-2 font-display text-[20px] text-[var(--panel-deep-text)]">
              Free plant over {CURRENCY}{FREE_PLANT_THRESHOLD}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--panel-deep-muted)]">
              Order above {CURRENCY}{FREE_PLANT_THRESHOLD} and we add a complimentary plant. Post a story from a previous order and tag us for another.
            </p>
            <p className="mt-3 text-[13px] text-[var(--panel-deep-muted)]">
              No Pot included until mentioned
            </p>
          </div>

          <div className="rounded-[28px] bg-[var(--color-sage-100)] px-5 py-6">
            <h2 className="mb-1.5 font-display text-[19px] text-[var(--color-sage-900)]">Not sure which one?</h2>
            <p className="mb-4 text-[13px] leading-relaxed text-[var(--color-sage-800)]">
              Tell us your balcony direction and how often you water. We will pick three that will actually live.
            </p>
            <WhatsAppButton href={buildWhatsAppLink(buildPlantAdviceMessage())} tone="sage">
              Ask on WhatsApp
            </WhatsAppButton>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a href="https://wa.me/917904050237" target="_blank" rel="noopener noreferrer" className="chip">
              <Icon name="whatsapp" filled className="h-4 w-4" />
              Ask before ordering
            </a>
            <a href="https://instagram.com/rosary_plant_house" target="_blank" rel="noopener noreferrer" className="chip">
              <Icon name="instagram" className="h-4 w-4" />
              Follow on Instagram
            </a>
            <Link to="/reviews" className="chip">
              <Icon name="star" className="h-4 w-4" />
              Reviews
            </Link>
          </div>
        </section>
      )}

      {/* Sticky cart bar */}
      {hasCart && (
        <StickyBar>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--text-secondary)]">
              {cartCount} {cartCount === 1 ? 'plant' : 'plants'} in cart
            </p>
            <p className="font-display text-xl text-[var(--text-primary)]">
              {CURRENCY}{cartTotal.toLocaleString('en-IN')}
            </p>
          </div>
          <Link to="/cart" className="btn btn-accent shrink-0 px-6">Review cart</Link>
        </StickyBar>
      )}
    </div>
  );
}
