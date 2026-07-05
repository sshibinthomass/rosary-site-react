import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../services/productService';
import { getLimitedPlants } from '../services/limitedService';
import { CATEGORIES } from '../config/constants';
import SEO from '../components/SEO';

const BATCH_SIZE = 50;

const SHOP_TRUST_BADGES = [
  { label: 'Safe Packaging', desc: 'Bare-rooted plants packed with care' },
  { label: 'Transit Replacement', desc: 'Damage support after delivery' },
  { label: 'Ships Mon & Wed', desc: 'Regular live-plant dispatch' },
  { label: '5-Star Rated', desc: 'Loved by plant parents' },
];

export default function ShopPage() {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('Recommended');
  const [filterWatering, setFilterWatering] = useState('Not Specific');
  const [filterSunlight, setFilterSunlight] = useState('Not Specific');
  const [filterTransit, setFilterTransit] = useState('Not Specific');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const categoryScrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef(null);

  // Determine selected category from URL or default to 'All'
  const selectedCategory = categoryName || 'All';
  const isCategoryPage = selectedCategory !== 'All';
  const shopCanonicalUrl = isCategoryPage
    ? `https://rosaryplanthouse.com/category/${encodeURIComponent(selectedCategory)}`
    : 'https://rosaryplanthouse.com/shop';
  const shopSeoTitle = isCategoryPage ? `${selectedCategory} Plants` : 'Shop Plants';
  const shopEyebrow = isCategoryPage ? `${selectedCategory} plant collection` : 'Rosary Plant House catalogue';
  const shopDescription = isCategoryPage
    ? `Browse current ${selectedCategory} plants available from Rosary Plant House. Use filters to choose by price, light, watering and transit sensitivity.`
    : 'Search current succulents, cacti, indoor plants and limited drops. Use filters to quickly choose plants by price, light, watering and transit sensitivity.';

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'Limited') {
          const limited = await getLimitedPlants();
          const limitedWithCategory = (limited || []).map((item) => ({
            ...item,
            category: item.category || 'Limited'
          }));
          setProducts(limitedWithCategory);
        } else {
          const data = await getProducts(selectedCategory);
          setProducts(data || []);
        }
        return;
      }

      // For 'All': fetch all limited and normal products
      const [limited, normal] = await Promise.all([
        getLimitedPlants(),
        getProducts(null)
      ]);
      
      const limitedWithCategory = (limited || []).map((item) => ({
        ...item,
        category: item.category || 'Limited'
      }));
      
      const normalList = normal || [];
      setProducts([...limitedWithCategory, ...normalList]);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  // Load products when category changes
  useEffect(() => {
    loadProducts();
    setSearchQuery('');
    setVisibleCount(BATCH_SIZE);
  }, [loadProducts]);

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

  // Filter products by search query and attributes
  const filteredProducts = products.filter((p) => {
    // Stock condition - completely hide out of stock items everywhere
    const inStock = p.available !== false && (p.qtyAvailable !== 'NA' || p.inStock);
    if (!inStock) return false;

    // Search condition
    let passesSearch = true;
    if (searchQuery.trim()) {
      const name = (p.title || p.name || p.commonName || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      passesSearch = name.includes(q) || category.includes(q);
    }
    
    // Normalize data legacy values (e.g. 'Med' -> 'Moderate/Medium')
    const productWatering = (p.watering === 'Med' || p.watering === 'Moderate' || p.watering === 'Medium' ? 'Moderate/Medium' : p.watering) || 'Moderate/Medium';
    const productSunlight = (p.sunlight === 'Med' || p.sunlight === 'Moderate' || p.sunlight === 'Medium' ? 'Moderate/Medium' : p.sunlight) || 'Moderate/Medium';
    const productTransit = p.transit === 'Safe' ? 'Low' : p.transit === 'Delicate' ? 'High' : (p.transit === 'Medium' || p.transit === 'Moderate' ? 'Moderate/Medium' : p.transit);
    
    // Attributes
    const passesWatering = filterWatering === 'Not Specific' || (productWatering === filterWatering);
    const passesSunlight = filterSunlight === 'Not Specific' || (productSunlight === filterSunlight);
    const passesTransit = filterTransit === 'Not Specific' || (productTransit === filterTransit);
    
    // Price
    const productPrice = p.salesPrice || p.price || 0;
    const passesPrice = 
      (!filterPriceMin || productPrice >= Number(filterPriceMin)) &&
      (!filterPriceMax || productPrice <= Number(filterPriceMax));
    
    return passesSearch && passesWatering && passesSunlight && passesTransit && passesPrice;
  });

  const sortedProducts = useMemo(() => {
    let sorted = [...filteredProducts];
    if (sortOption === 'Price: Low to High') {
      sorted.sort((a, b) => {
        const pA = a.salesPrice || a.price || 0;
        const pB = b.salesPrice || b.price || 0;
        return pA - pB;
      });
    } else if (sortOption === 'Price: High to Low') {
      sorted.sort((a, b) => {
        const pA = a.salesPrice || a.price || 0;
        const pB = b.salesPrice || b.price || 0;
        return pB - pA;
      });
    } else if (sortOption === 'Newest') {
      sorted.sort((a, b) => {
        const isALimited = a.category === 'Limited';
        const isBLimited = b.category === 'Limited';
        
        if (isALimited && !isBLimited) return -1;
        if (!isALimited && isBLimited) return 1;

        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return idB - idA;
      });
    }

    return sorted;
  }, [filteredProducts, sortOption]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [searchQuery, filterWatering, filterSunlight, filterTransit, filterPriceMin, filterPriceMax, sortOption]);

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

  const hasActiveAdvancedFilters =
    filterWatering !== 'Not Specific' ||
    filterSunlight !== 'Not Specific' ||
    filterTransit !== 'Not Specific' ||
    filterPriceMin ||
    filterPriceMax;
  const productCountLabel = hasMore
    ? `${Math.min(visibleCount, sortedProducts.length)} of ${sortedProducts.length}`
    : `${sortedProducts.length}`;
  const selectedCategoryLabel = selectedCategory === 'All' ? 'All Plants' : `${selectedCategory} Plants`;
  const selectChevronStyle = {
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1em 1em'
  };
  const selectClassName = 'mt-1.5 h-11 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 pr-9 text-sm font-medium text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/15 cursor-pointer appearance-none';
  const priceInputClassName = 'h-11 min-w-0 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-sm font-medium text-[var(--text-primary)] shadow-sm outline-none transition placeholder:text-[var(--text-secondary)]/70 focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/15';

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
    <div className="animate-fade-in min-h-screen pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <SEO 
        title={shopSeoTitle}
        description="Shop succulents, cacti, indoor plants and balcony plants from Rosary Plant House, Coonoor. Search, filter and choose plants with safe packing and support."
        canonicalUrl={shopCanonicalUrl}
        schemaData={homeSchema}
      />
      {/* Shop Header */}
      <section className="mb-4">
        <div className="relative overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm md:p-5">
          {/* Decorative elements */}
          <div className="hidden" />
          <div className="hidden" />
          
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            {/* Text content */}
            <div className="max-w-3xl text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-forest)]">{shopEyebrow}</p>
              <h1
                className="text-2xl font-bold leading-tight text-[var(--text-primary)] md:text-3xl"
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
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {shopDescription}
              </p>
              
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a href="https://wa.me/917904050237" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-forest-light)]">
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 21.841c-1.613 0-3.193-.433-4.577-1.252l-.328-.194-3.398.891.905-3.314-.213-.339A9.813 9.813 0 012.186 12 9.845 9.845 0 0112 2.159 9.845 9.845 0 0121.814 12 9.845 9.845 0 0112 21.841z"></path></svg>
                  Ask before ordering
                </a>
                <a href="https://instagram.com/rosary_plant_house" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--color-forest)]">
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg>
                  Follow on Instagram
                </a>
              </div>
            </div>

            {/* Hero plant image (desktop only) */}
            <div className="hidden">
              <div className="relative w-40 h-40 lg:w-52 lg:h-52">
                <div className="absolute -inset-1 bg-white/15 rounded-full animate-pulse-soft" />
                <img
                  src="/hero-plant.png"
                  alt="Beautiful succulents from Rosary Plant House nursery"
                  className="w-full h-full object-cover rounded-full border-3 border-white/30 shadow-xl"
                />
              </div>
            </div>
          </div>

          {/* Offer banner */}
          <div className="relative z-10 mt-4 rounded-lg bg-[var(--color-sage)]/15 px-3 py-2 text-xs font-semibold leading-5 text-[var(--color-forest)] md:flex md:items-center md:justify-between">
            <p>
              Purchase above INR 1000 and get a complimentary plant.
            </p>
            <p>
              Post an Instagram story from your previous order, tag us and get a complimentary plant.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {[
            { icon: '📦', label: 'Safe Packaging', desc: 'Plants packed with care' },
            { icon: '🔄', label: 'Transit Replacement', desc: 'Damage? We replace it' },
            { icon: '🚚', label: 'Ships Mon & Wed', desc: 'Regular dispatch schedule' },
            { icon: '⭐', label: '5-Star Rated', desc: 'Loved by customers' },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-2.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] hover:shadow-sm transition-shadow">
              <span className="text-xl shrink-0">{badge.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{badge.label}</p>
                <p className="text-[10px] text-[var(--text-secondary)] leading-tight mt-0.5 hidden md:block">{badge.desc}</p>
              </div>
            </div>
          ))}
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
              placeholder="Search plants by name or category..."
              aria-label="Search plants by name or category"
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

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Watering</span>
                <select
                  aria-label="Watering"
                  value={filterWatering}
                  onChange={(e) => setFilterWatering(e.target.value)}
                  className={selectClassName}
                  style={selectChevronStyle}
                >
                  <option value="Not Specific">Any</option>
                  <option value="Low">Low</option>
                  <option value="Moderate/Medium">Moderate/Medium</option>
                  <option value="High">High</option>
                </select>
              </label>

              <label className="block min-w-0">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Sunlight</span>
                <select
                  aria-label="Sunlight"
                  value={filterSunlight}
                  onChange={(e) => setFilterSunlight(e.target.value)}
                  className={selectClassName}
                  style={selectChevronStyle}
                >
                  <option value="Not Specific">Any</option>
                  <option value="Low">Low</option>
                  <option value="Moderate/Medium">Moderate/Medium</option>
                  <option value="High">High</option>
                </select>
              </label>

              <label className="block min-w-0">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Transit</span>
                <select
                  aria-label="Transit"
                  value={filterTransit}
                  onChange={(e) => setFilterTransit(e.target.value)}
                  className={selectClassName}
                  style={selectChevronStyle}
                >
                  <option value="Not Specific">Any</option>
                  <option value="Low">Low</option>
                  <option value="Moderate/Medium">Moderate/Medium</option>
                  <option value="High">High</option>
                </select>
              </label>

              <label className="block min-w-0">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Price</span>
                <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input
                    type="number"
                    value={filterPriceMin}
                    onChange={(e) => setFilterPriceMin(e.target.value)}
                    placeholder="Min"
                    min="0"
                    inputMode="numeric"
                    className={priceInputClassName}
                    aria-label="Minimum price"
                  />
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">to</span>
                  <input
                    type="number"
                    value={filterPriceMax}
                    onChange={(e) => setFilterPriceMax(e.target.value)}
                    placeholder="Max"
                    min="0"
                    inputMode="numeric"
                    className={priceInputClassName}
                    aria-label="Maximum price"
                  />
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between xl:justify-end">
              <div className="min-h-11 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] shadow-sm sm:min-w-[12rem]">
                {searchQuery.trim() ? (
                  <span>
                    {sortedProducts.length} result{sortedProducts.length !== 1 ? 's' : ''} for "<strong className="font-semibold text-[var(--text-primary)]">{searchQuery}</strong>"
                  </span>
                ) : (
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">{selectedCategoryLabel}</strong>{' '}
                    <span className="text-xs opacity-75">({productCountLabel})</span>
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                {hasActiveAdvancedFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterWatering('Not Specific');
                      setFilterSunlight('Not Specific');
                      setFilterTransit('Not Specific');
                      setFilterPriceMin('');
                      setFilterPriceMax('');
                    }}
                    className="h-11 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-sm font-semibold text-[var(--color-forest)] shadow-sm transition hover:border-[var(--color-forest)] focus:outline-none focus:ring-2 focus:ring-[var(--color-forest)]/20"
                  >
                    Clear filters
                  </button>
                )}

                <label className="block min-w-0 sm:w-56">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Sort by</span>
                  <select
                    id="sort-select"
                    aria-label="Sort products"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className={selectClassName}
                    style={selectChevronStyle}
                  >
                    <option value="Recommended">Recommended</option>
                    <option value="Price: Low to High">Price: Low to High</option>
                    <option value="Price: High to Low">Price: High to Low</option>
                    <option value="Newest">Newest</option>
                  </select>
                </label>
              </div>
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
