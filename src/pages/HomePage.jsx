import { useState, useEffect, useCallback, useRef, Fragment, lazy, Suspense, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getProducts, getProductById } from '../services/productService';
import { getLimitedPlants } from '../services/limitedService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CATEGORIES } from '../config/constants';
import reviewsData from '../data/reviews.json';
import SEO from '../components/SEO';

const ProductModal = lazy(() => import('../components/ProductModal'));

export default function HomePage() {
  const { categoryName, productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, isInCart, addToWishlist, removeFromWishlist, isInWishlist } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [previousCategory, setPreviousCategory] = useState(null);
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

  // Determine selected category from URL or default to 'All'
  const selectedCategory = categoryName || 'All';

  // Load products when category changes
  useEffect(() => {
    loadProducts();
    setSearchQuery('');
  }, [selectedCategory]);

  // Load specific product if productId is in URL
  useEffect(() => {
    if (productId) {
      loadProductFromUrl(productId);
    }
  }, [productId]);

  const loadProducts = async () => {
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
  };

  const loadProductFromUrl = async (id) => {
    try {
      const product = await getProductById(id);
      if (product) {
        setSelectedProduct(product);
      }
    } catch (error) {
      console.error('Error loading product:', error);
    }
  };


  const handleAddToCart = useCallback(async (product, quantity = 1) => {
    await addToCart(product, quantity);
  }, [addToCart]);

  const handleToggleWishlist = useCallback(async (product) => {
    if (isInWishlist(product.id)) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product);
    }
  }, [isInWishlist, addToWishlist, removeFromWishlist]);

  const handleCategoryClick = useCallback((category) => {
    if (category === 'All') {
      navigate('/', { state: { preventScroll: true } });
    } else {
      navigate(`/category/${encodeURIComponent(category)}`, { state: { preventScroll: true } });
    }
  }, [navigate]);

  const handleQuickView = useCallback((product) => {
    // Remember current category before opening plant modal
    setPreviousCategory(selectedCategory);
    setSelectedProduct(product);
    // Update URL without full navigation
    navigate(`/plant/${product.id}`, { replace: true, state: { preventScroll: true } });
  }, [selectedCategory, navigate]);

  const handleCloseModal = useCallback(() => {
    setSelectedProduct(null);
    // Navigate back to previous category or home
    const returnCategory = previousCategory || categoryName;
    if (returnCategory && returnCategory !== 'All') {
      navigate(`/category/${encodeURIComponent(returnCategory)}`, { replace: true, state: { preventScroll: true } });
    } else {
      navigate('/', { replace: true, state: { preventScroll: true } });
    }
    setPreviousCategory(null);
  }, [previousCategory, categoryName, navigate]);

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

  // Pick 4 reviews for the homepage carousel
  const homeReviews = reviewsData.slice(0, 4);

  return (
    <div className="animate-fade-in">
      <SEO 
        title={selectedCategory === 'All' ? 'Buy Succulents & Indoor Plants Online' : `${selectedCategory} Plants`} 
        description={selectedCategory === 'All' 
          ? 'Discover rare succulents, cacti, and beautiful indoor plants curated with love from the Nilgiris. Shop online for safe delivery across India.' 
          : `Browse our collection of beautiful ${selectedCategory.toLowerCase()} plants. Safe packaging & delivery.`}
      />
      {/* Hero Section */}
      <section className="mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#047857] dark:from-[#022c22] dark:via-[#064e3b] dark:to-[#065f46] p-6 md:p-10 text-white shadow-lg">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
            {/* Text content */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-green-200 text-sm font-medium tracking-wide uppercase mb-2">From the Nilgiris, Coonoor</p>
              <h2 className="text-2xl md:text-4xl font-bold leading-tight mb-3">
                Bringing Nature's Finest <br className="hidden md:block" />
                <span className="text-green-300">Succulents & Plants</span> to You
              </h2>
              <p className="text-green-100/80 text-sm md:text-base leading-relaxed max-w-lg mb-5">
                Discover rare succulents, cacti, and beautiful indoor plants curated with love. 
                Each plant is hand-picked and safely packed from our nursery in the Queen of Hills.
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <a href="https://wa.me/917904050237" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full font-medium text-sm transition-all shadow-md hover:shadow-lg hover:scale-105">
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 21.841c-1.613 0-3.193-.433-4.577-1.252l-.328-.194-3.398.891.905-3.314-.213-.339A9.813 9.813 0 012.186 12 9.845 9.845 0 0112 2.159 9.845 9.845 0 0121.814 12 9.845 9.845 0 0112 21.841z"></path></svg>
                  Chat with us
                </a>
                <a href="https://instagram.com/rosary_plant_house" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium transition-all border border-white/20">
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg>
                  Follow us
                </a>
              </div>
            </div>

            {/* Hero plant image (desktop only) */}
            <div className="hidden md:flex items-center justify-center shrink-0">
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

          {/* Offer banner — subtle, inside hero */}
          <div className="relative z-10 mt-5 bg-white/10 backdrop-blur-sm rounded-xl py-2.5 px-4 text-center border border-white/15">
            <p className="text-green-100 text-sm font-medium">
              🎁 Purchase for more than ₹1000/- and get a <span className="text-green-300 font-semibold">Complementary Plant!</span>
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

      {/* Search Bar */}
      <section className="mb-4">
        <div className="relative flex items-center">
          <svg className="absolute left-4 w-5 h-5 text-[var(--text-secondary)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plants by name or category..."
            className="input pr-10"
            style={{ paddingLeft: '2.75rem' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 w-5 h-5 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* Category Filter */}
      <section className="mb-4">
        <div className="relative group">
          {/* Left scroll arrow */}
          {canScrollLeft && (
            <button
              onClick={() => {
                const el = categoryScrollerRef.current;
                if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
              }}
              className="absolute left-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-transparent transition-opacity"
              aria-label="Scroll left"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--bg-secondary)] shadow-md border border-[var(--border-color)] flex items-center justify-center">
                <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            </button>
          )}

          <div ref={categoryScrollerRef} className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1 scroll-smooth">
            {categories.map((category) => {
              const isLimited = category === 'Limited';
              const isSelected = selectedCategory === category;
              
              let baseClass = "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all";
              let colorClass = "";
              
              if (isSelected) {
                colorClass = isLimited 
                  ? "bg-red-600 text-white shadow-md" 
                  : "bg-[var(--color-forest)] text-white";
              } else {
                colorClass = isLimited
                  ? "bg-red-50 text-red-600 border border-red-200 hover:border-red-600 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:border-red-500"
                  : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--color-forest)]";
              }

              return (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`${baseClass} ${colorClass}`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* Right scroll arrow */}
          {canScrollRight && (
            <button
              onClick={() => {
                const el = categoryScrollerRef.current;
                if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
              }}
              className="absolute right-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center bg-gradient-to-l from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-transparent transition-opacity"
              aria-label="Scroll right"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--bg-secondary)] shadow-md border border-[var(--border-color)] flex items-center justify-center">
                <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Advanced Filters (Water, Sunlight, Transit) */}
      <section className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterWatering}
            onChange={(e) => setFilterWatering(e.target.value)}
            className="flex-1 min-w-[140px] sm:flex-none sm:w-auto text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-full px-3 py-1.5 pr-7 focus:outline-none focus:border-[var(--color-forest)] focus:ring-1 focus:ring-[var(--color-forest)] cursor-pointer appearance-none relative"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '0.8em 0.8em'
            }}
          >
            <option value="Not Specific">💧 Not Specific</option>
            <option value="Low">💧 Low</option>
            <option value="Moderate/Medium">💧 Moderate/Medium</option>
            <option value="High">💧 High</option>
          </select>
          
          <select
            value={filterSunlight}
            onChange={(e) => setFilterSunlight(e.target.value)}
            className="flex-1 min-w-[140px] sm:flex-none sm:w-auto text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-full px-3 py-1.5 pr-7 focus:outline-none focus:border-[var(--color-forest)] focus:ring-1 focus:ring-[var(--color-forest)] cursor-pointer appearance-none relative"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '0.8em 0.8em'
            }}
          >
            <option value="Not Specific">☀️ Not Specific</option>
            <option value="Low">☀️ Low</option>
            <option value="Moderate/Medium">☀️ Moderate/Medium</option>
            <option value="High">☀️ High</option>
          </select>

          <select
            value={filterTransit}
            onChange={(e) => setFilterTransit(e.target.value)}
            className="flex-1 min-w-[140px] sm:flex-none sm:w-auto text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-full px-3 py-1.5 pr-7 focus:outline-none focus:border-[var(--color-forest)] focus:ring-1 focus:ring-[var(--color-forest)] cursor-pointer appearance-none relative"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '0.8em 0.8em'
            }}
          >
            <option value="Not Specific">📦 Not Specific</option>
            <option value="Low">📦 Low</option>
            <option value="Moderate/Medium">📦 Moderate/Medium</option>
            <option value="High">📦 High</option>
          </select>
          
          {/* Price Range */}
          <div className="flex items-center gap-1 flex-1 min-w-[180px] sm:flex-none sm:w-auto">
            <span className="text-xs text-[var(--text-secondary)] font-medium whitespace-nowrap">₹</span>
            <input
              type="number"
              value={filterPriceMin}
              onChange={(e) => setFilterPriceMin(e.target.value)}
              placeholder="Min"
              min="0"
              className="w-20 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-full px-3 py-1.5 focus:outline-none focus:border-[var(--color-forest)] focus:ring-1 focus:ring-[var(--color-forest)]"
            />
            <span className="text-xs text-[var(--text-secondary)]">–</span>
            <input
              type="number"
              value={filterPriceMax}
              onChange={(e) => setFilterPriceMax(e.target.value)}
              placeholder="Max"
              min="0"
              className="w-20 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-full px-3 py-1.5 focus:outline-none focus:border-[var(--color-forest)] focus:ring-1 focus:ring-[var(--color-forest)]"
            />
          </div>
          
          {(filterWatering !== 'Not Specific' || filterSunlight !== 'Not Specific' || filterTransit !== 'Not Specific' || filterPriceMin || filterPriceMax) && (
             <button
              onClick={() => {
                setFilterWatering('Not Specific');
                setFilterSunlight('Not Specific');
                setFilterTransit('Not Specific');
                setFilterPriceMin('');
                setFilterPriceMax('');
              }}
              className="text-xs text-[var(--color-forest)] font-medium hover:underline ml-1"
            >
              Clear Filters
            </button>
          )}
        </div>
      </section>

      {/* Search Results Info & Sorting */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {searchQuery.trim() ? (
          <div className="text-sm text-[var(--text-secondary)]">
            <span>Showing {sortedProducts.length} result{sortedProducts.length !== 1 ? 's' : ''} for "<strong className="text-[var(--text-primary)]">{searchQuery}</strong>"</span>
          </div>
        ) : (
          <div className="text-sm text-[var(--text-secondary)] font-medium">
            <span>{selectedCategory === 'All' ? 'All Plants' : `${selectedCategory} Plants`} <span className="text-xs opacity-70">({sortedProducts.length})</span></span>
          </div>
        )}
        
        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 z-20 relative">
          <label htmlFor="sort-select" className="text-sm text-[var(--text-secondary)] font-medium whitespace-nowrap">Sort by:</label>
          <select
            id="sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[var(--color-forest)] focus:ring-1 focus:ring-[var(--color-forest)] cursor-pointer appearance-none relative"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1em 1em'
            }}
          >
            <option value="Recommended">Recommended</option>
            <option value="Price: Low to High">Price: Low to High</option>
            <option value="Price: High to Low">Price: High to Low</option>
            <option value="Newest">Newest</option>
          </select>
        </div>
      </div>

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
              {sortedProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={handleQuickView}
                  index={index}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Customer Reviews Section */}
      {!searchQuery && selectedCategory === 'All' && (
        <section className="mt-12 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">What Our Customers Say</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Trusted by plant lovers across India</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {homeReviews.map((review, index) => (
              <div key={index} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-forest)] to-[var(--color-forest-light)] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {review.author.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate">{review.author}</h4>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3 italic">
                  "{review.text}"
                </p>
                {review.images && review.images.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
                    {review.images.map((img, i) => (
                      <img key={i} src={img} alt={`Review photo ${i + 1}`} className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-md shadow-sm shrink-0" />
                    ))}
                  </div>
                )}
                {review.link && (
                  <div className="mt-3">
                    <a href={review.link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[var(--color-forest)] hover:underline inline-flex items-center gap-1">
                      Read review on Google
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/reviews')}
              className="text-sm font-medium text-[var(--color-forest)] hover:underline inline-flex items-center gap-1"
            >
              View all reviews
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
      )}

      {/* Product Modal - lazy loaded */}
      {selectedProduct && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full border-3 border-white/30 border-t-white animate-spin" />
          </div>
        }>
          <ProductModal
            product={selectedProduct}
            isOpen={!!selectedProduct}
            onClose={handleCloseModal}
            onAddToCart={handleAddToCart}
            inCart={selectedProduct ? isInCart(selectedProduct.id) : false}
            inWishlist={selectedProduct ? isInWishlist(selectedProduct.id) : false}
            onToggleWishlist={handleToggleWishlist}
          />
        </Suspense>
      )}
    </div>
  );
}
