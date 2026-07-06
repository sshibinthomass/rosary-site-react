import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { CATEGORIES } from '../config/constants';
import SEO from '../components/SEO';
import { CATALOG_REFRESH_EVENT } from '../utils/catalogRefresh';
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

export default function ShopPage() {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const categoryScrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef(null);
  const backgroundLoadCancelRef = useRef(null);
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
  const shopEyebrow = isCategoryPage ? `${selectedCategory} plant collection` : 'Rosary Plant House catalogue';
  const shopDescription = isCategoryPage
    ? `Browse current ${selectedCategory} plants available from Rosary Plant House.`
    : 'Search current succulents, cacti, indoor plants and limited drops from Rosary Plant House.';
  const shopHeroBackground = SHOP_CATEGORY_BACKGROUNDS[selectedCategory] || SHOP_CATEGORY_BACKGROUNDS['Others'];
  const shopHeroStyle = {
    backgroundImage: `linear-gradient(90deg, rgba(10, 16, 28, 0.96) 0%, rgba(10, 16, 28, 0.86) 44%, rgba(10, 16, 28, 0.58) 100%), url(${shopHeroBackground})`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
  };
  const activeTypewriterExample = SMART_SEARCH_EXAMPLES[typewriterHint.index] || SMART_SEARCH_EXAMPLES[0];
  const animatedSearchPlaceholder = searchQuery.trim()
    ? SEARCH_PLACEHOLDER
    : prefersReducedMotion
      ? `Try ${SMART_SEARCH_EXAMPLES[0]}`
      : `Try ${activeTypewriterExample.slice(0, typewriterHint.charCount)}|`;

  const scheduleBackgroundLoad = useCallback((callback) => {
    if (backgroundLoadCancelRef.current) {
      backgroundLoadCancelRef.current();
      backgroundLoadCancelRef.current = null;
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(callback, { timeout: 4000 });
      backgroundLoadCancelRef.current = () => window.cancelIdleCallback(idleId);
      return;
    }

    const timeoutId = window.setTimeout(callback, 1200);
    backgroundLoadCancelRef.current = () => window.clearTimeout(timeoutId);
  }, []);

  const loadProducts = useCallback(async () => {
    if (backgroundLoadCancelRef.current) {
      backgroundLoadCancelRef.current();
      backgroundLoadCancelRef.current = null;
    }

    setLoading(true);
    try {
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'Limited') {
          const { getLimitedPlants } = await loadLimitedService();
          const limited = await getLimitedPlants();
          const limitedWithCategory = (limited || []).map((item) => ({
            ...item,
            category: item.category || 'Limited'
          }));
          setProducts(limitedWithCategory);
        } else {
          const { getProducts, getProductsPage } = await loadProductService();
          const firstPage = await getProductsPage(selectedCategory, BATCH_SIZE);
          setProducts(firstPage.products || []);

          if (firstPage.hasMore) {
            scheduleBackgroundLoad(async () => {
              try {
                const data = await getProducts(selectedCategory);
                setProducts(data || []);
              } catch (error) {
                console.error('Error loading full product catalog:', error);
              }
            });
          }
        }
        return;
      }

      // For 'All': show a small first page, then hydrate the full catalog after first paint.
      const [{ getLimitedPlants }, { getProducts, getProductsPage }] = await Promise.all([
        loadLimitedService(),
        loadProductService()
      ]);
      const [limited, normalPage] = await Promise.all([
        getLimitedPlants(),
        getProductsPage(null, BATCH_SIZE)
      ]);
      
      const limitedWithCategory = (limited || []).map((item) => ({
        ...item,
        category: item.category || 'Limited'
      }));

      setProducts([...limitedWithCategory, ...(normalPage.products || [])]);

      if (normalPage.hasMore) {
        scheduleBackgroundLoad(async () => {
          try {
            const normal = await getProducts(null);
            setProducts([...limitedWithCategory, ...(normal || [])]);
          } catch (error) {
            console.error('Error loading full product catalog:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, scheduleBackgroundLoad]);

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
    let cancelled = false;

    const startLoadingProducts = () => {
      if (!cancelled) loadProducts();
    };

    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      frameId = window.requestAnimationFrame(() => {
        timeoutId = window.setTimeout(startLoadingProducts, 0);
      });
    } else {
      timeoutId = setTimeout(startLoadingProducts, 0);
    }

    setSearchQuery('');
    setVisibleCount(BATCH_SIZE);
    return () => {
      cancelled = true;
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (backgroundLoadCancelRef.current) {
        backgroundLoadCancelRef.current();
        backgroundLoadCancelRef.current = null;
      }
    };
  }, [loadProducts]);

  useEffect(() => {
    if (searchQuery.trim().length < 2 || searchEnrichmentById) return;
    loadSearchEnrichment();
  }, [loadSearchEnrichment, searchEnrichmentById, searchQuery]);

  const handleCategoryClick = useCallback((category) => {
    if (category === 'All') {
      navigate('/shop', { state: { preventScroll: true } });
    } else {
      navigate(`/category/${encodeURIComponent(category)}`, { state: { preventScroll: true } });
    }
  }, [navigate]);

  const categories = ['All', 'Limited', ...CATEGORIES];

  // Track category scroller scroll position
  useEffect(() => {
    const el = categoryScrollerRef.current;
    if (!el) return;
    const updateScrollState = () => {
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    };
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [categories.length]);

  // Filter products by stock and search query.
  const filteredProducts = products.filter((p) => {
    // Stock condition - completely hide out of stock items everywhere
    const inStock = p.available !== false && (p.qtyAvailable !== 'NA' || p.inStock);
    if (!inStock) return false;

    // Search condition
    let passesSearch = true;
    if (searchQuery.trim()) {
      const localProduct = searchEnrichmentById?.get(String(p.id));
      const searchableProduct = localProduct ? mergeProductWithLocalEnrichment(p, localProduct) : p;
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
      const q = searchQuery.trim().toLowerCase();
      passesSearch = name.includes(q) || category.includes(q) || matchesShopSearch(searchableProduct, searchQuery);
    }

    return passesSearch;
  });

  const sortedProducts = filteredProducts;

  // Reset visible count when search changes.
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [searchQuery]);

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

  return (
    <div className="min-h-screen pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <SEO 
        title={shopSeoTitle}
        description="Shop succulents, cacti, indoor plants and balcony plants from Rosary Plant House, Coonoor. Search and choose plants with safe packing and support."
        canonicalUrl={shopCanonicalUrl}
        schemaData={homeSchema}
      />
      {/* Shop Header */}
      <section className="mb-4">
        <div
          className="relative overflow-hidden rounded-lg border border-white/10 bg-slate-950 p-4 text-white shadow-sm md:p-5"
          style={shopHeroStyle}
        >
          {/* Decorative elements */}
          <div className="hidden" />
          <div className="hidden" />
          
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            {/* Text content */}
            <div className="max-w-3xl text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-forest)]">{shopEyebrow}</p>
              <h1
                className="text-2xl font-bold leading-tight text-white md:text-3xl"
                aria-label={isCategoryPage ? `Shop ${selectedCategory} plants` : 'Shop live plants'}
              >
                {isCategoryPage ? (
                  <>
                    Shop <strong className="font-extrabold text-[var(--color-forest)]">{selectedCategory}</strong> plants
                  </>
                ) : (
                  'Shop live plants'
                )}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/72">
                {shopDescription}
              </p>
              
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a href="https://wa.me/917904050237" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-forest-light)]">
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 21.841c-1.613 0-3.193-.433-4.577-1.252l-.328-.194-3.398.891.905-3.314-.213-.339A9.813 9.813 0 012.186 12 9.845 9.845 0 0112 2.159 9.845 9.845 0 0121.814 12 9.845 9.845 0 0112 21.841z"></path></svg>
                  Ask before ordering
                </a>
                <a href="https://instagram.com/rosary_plant_house" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-forest)] hover:bg-black/45">
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg>
                  Follow on Instagram
                </a>
                <Link to="/reviews" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-forest)] hover:bg-black/45">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                    <path d="m9 10 2 2 4-4" />
                  </svg>
                  Reviews
                </Link>
              </div>
            </div>

          </div>

          {/* Offer banner */}
          <div className="relative z-10 mt-4 space-y-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold leading-5 text-emerald-200">
            <p>
              Purchase above INR 1000 and get a complimentary plant.
            </p>
            <p>
              Post an Instagram story from your previous order, tag us and get a complimentary plant.
            </p>
            <p>
              No Pot included until mentioned
            </p>
          </div>
        </div>
      </section>

      {/* Catalog Controls */}
      <section className="mb-5">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 shadow-sm md:p-4">
          <div className="relative flex items-center">
            <svg className="pointer-events-none absolute left-4 h-5 w-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={animatedSearchPlaceholder}
              aria-label="Search plants by name or category, care need, or budget"
              className="input h-12 pr-11 text-sm md:h-14 md:text-base"
              style={{ paddingLeft: '2.75rem' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-forest)]/20"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]" aria-label="Smart search examples">
            <span className="font-semibold text-[var(--text-primary)]">Try:</span>
            {SMART_SEARCH_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setSearchQuery(example)}
                className="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 font-medium text-[var(--text-secondary)] transition hover:border-[var(--color-forest)] hover:text-[var(--color-forest)] focus:outline-none focus:ring-2 focus:ring-[var(--color-forest)]/20"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-2">
            <div className="relative group">
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => {
                    const el = categoryScrollerRef.current;
                    if (el) el.scrollBy({ left: -240, behavior: 'smooth' });
                  }}
                  className="absolute bottom-0 left-0 top-0 z-10 flex w-10 items-center justify-center bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/85 to-transparent transition-opacity"
                  aria-label="Scroll categories left"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-md">
                    <svg className="h-4 w-4 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </span>
                </button>
              )}

              <div ref={categoryScrollerRef} className="flex gap-2 overflow-x-auto no-scrollbar px-1 py-1 scroll-smooth">
                {categories.map((category) => {
                  const isLimited = category === 'Limited';
                  const isSelected = selectedCategory === category;
                  const baseClass = 'h-10 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-forest)]/20';
                  let colorClass = '';

                  if (isSelected) {
                    colorClass = isLimited
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-[var(--color-forest)] text-white shadow-sm';
                  } else {
                    colorClass = isLimited
                      ? 'border border-red-200 bg-red-50 text-red-600 hover:border-red-500 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                      : 'border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--color-forest)]';
                  }

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      className={`${baseClass} ${colorClass}`}
                      aria-pressed={isSelected}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => {
                    const el = categoryScrollerRef.current;
                    if (el) el.scrollBy({ left: 240, behavior: 'smooth' });
                  }}
                  className="absolute bottom-0 right-0 top-0 z-10 flex w-10 items-center justify-center bg-gradient-to-l from-[var(--bg-primary)] via-[var(--bg-primary)]/85 to-transparent transition-opacity"
                  aria-label="Scroll categories right"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-md">
                    <svg className="h-4 w-4 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Products Grid */}
      <section>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card overflow-hidden flex flex-col">
                {/* Image skeleton */}
                <div className="relative w-full aspect-[4/3] skeleton-shimmer">
                  {/* Category badge placeholder */}
                  <div className="absolute bottom-2 left-2 w-16 h-5 bg-white/20 rounded-lg" />
                  {/* Heart button placeholder */}
                  <div className="absolute bottom-2 right-2 w-8 h-8 bg-white/20 rounded-full" />
                </div>
                {/* Content skeleton */}
                <div className="p-3 md:p-4 flex flex-col gap-2 bg-[var(--bg-primary)]">
                  {/* ID + Name + Price row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 skeleton-shimmer rounded w-10" />
                      <div className="h-4 skeleton-shimmer rounded w-3/4" />
                    </div>
                    <div className="h-5 skeleton-shimmer rounded w-16 shrink-0" />
                  </div>
                  {/* Attribute tiles */}
                  <div className="flex gap-1.5">
                    <div className="h-7 skeleton-shimmer rounded-lg w-16" />
                    <div className="h-7 skeleton-shimmer rounded-lg w-16" />
                    <div className="h-7 skeleton-shimmer rounded-lg w-16" />
                  </div>
                  {/* Add to cart row */}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-9 skeleton-shimmer rounded-lg w-24" />
                    <div className="h-9 skeleton-shimmer rounded-lg flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] max-w-2xl mx-auto shadow-sm">
            <div className="w-24 h-24 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-5 relative">
               <span className="text-4xl absolute animate-bounce" style={{animationDuration: '2s'}}>{searchQuery ? '🔍' : '🪴'}</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
               {searchQuery ? "No matching plants found" : "This category is empty"}
            </h3>
            <p className="text-[var(--text-secondary)] text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? `We couldn't find any plants matching "${searchQuery}". Try checking for typos, using broader terms, or exploring other categories.`
                : 'We are currently out of stock of these plants. Please check back later or browse our other beautiful collections.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-2.5 bg-[var(--color-forest)] text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={() => handleCategoryClick('All')}
                className="px-6 py-2.5 bg-[var(--color-forest)] text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                Browse All Plants
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 stagger-children">
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
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading more plants...
                </div>
              </div>
            )}
          </>
        )}
      </section>


    </div>
  );
}
