import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../services/productService';
import { getLimitedPlants } from '../services/limitedService';
import { CATEGORIES } from '../config/constants';
import SEO from '../components/SEO';
import reviewsData from '../data/reviews.json';

const BATCH_SIZE = 50;

export default function ShopPage() {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef(null);

  // Determine selected category from URL or default to 'All'
  const selectedCategory = categoryName || 'All';
  const shopCanonicalUrl = selectedCategory === 'All'
    ? 'https://rosaryplanthouse.com/shop'
    : `https://rosaryplanthouse.com/category/${encodeURIComponent(selectedCategory)}`;
  const shopSeoTitle = selectedCategory === 'All' ? 'Shop Plants' : `${selectedCategory} Plants`;

  // Auto-swiping carousel logic for mobile reviews
  useEffect(() => {
    // Only run interval if reviews exist
    if (reviewsData && reviewsData.length > 0) {
      const interval = setInterval(() => {
        // hard-coded 4 visible reviews on homepage
        setActiveReviewIndex((prevIndex) => (prevIndex + 1) % 4);
      }, 5000); // Swipe every 5 seconds
      return () => clearInterval(interval);
    }
  }, []);

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

  // Pick best reviews for the homepage carousel
  let homeReviews = reviewsData.filter(r => r.featured).slice(0, 4);
  if (homeReviews.length < 4) {
    const additional = reviewsData.filter(r => !r.featured).slice(0, 4 - homeReviews.length);
    homeReviews.push(...additional);
  }

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
      {/* Hero Section */}
      <section className="mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#047857] dark:from-[#022c22] dark:via-[#064e3b] dark:to-[#065f46] p-6 md:p-10 text-white shadow-lg">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
            {/* Text content */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-green-200 text-sm font-medium tracking-wide uppercase mb-2">From the Queen of Hills... Nilgiris, Coonoor</p>
              <h2 className="text-2xl md:text-4xl font-bold leading-tight mb-3">
                Bringing Nature's Finest <br className="hidden md:block" />
                <span className="text-green-300">Succulents & Plants</span> to You
              </h2>
              <p className="text-green-100/80 text-sm md:text-base leading-relaxed max-w-lg mb-5">
                Discover rare succulents, cacti, and beautiful indoor plants curated with love, starting from just <span className="font-semibold text-green-300">₹39</span>. 
                We love encouraging plant parents with our healthy <span className="font-semibold text-green-300">DIY bare-rooted plants</span>, hand-picked and safely packed from our nursery in the Queen of Hills.
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
          <div className="relative z-10 mt-5 bg-white/10 backdrop-blur-sm rounded-xl py-3 px-4 text-center border border-white/15">
            <p className="text-green-100 text-sm font-medium mb-1.5">
              🎁 Purchase for more than ₹1000/- and get a <span className="text-green-300 font-semibold">Complimentary Plant!</span>
            </p>
            <p className="text-green-100 text-sm font-medium">
              📸 Post an insta story from your previous order, tag us and get a <span className="text-green-300 font-semibold">Complimentary Plant!</span>
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

      {/* Customer Reviews Section */}
      {!searchQuery && selectedCategory === 'All' && (
        <section className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">What Our Customers Say</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Trusted by plant lovers across India</p>
          </div>
          
          {/* Desktop View: Grid */}
          <div className="hidden md:grid md:grid-cols-2 gap-4">
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

          {/* Mobile View: Auto-swiping Carousel */}
          <div className="md:hidden relative overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out" 
              style={{ transform: `translateX(-${activeReviewIndex * 100}%)` }}
            >
              {homeReviews.map((review, index) => (
                <div key={index} className="w-full flex-shrink-0 px-2 pb-6">
                  <div className="card p-5 shadow-sm border border-[var(--border-color)]">
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
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-4 italic">
                      "{review.text}"
                    </p>
                    {review.images && review.images.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
                        {review.images.map((img, i) => (
                          <img key={i} src={img} alt={`Review photo ${i + 1}`} className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-md shadow-sm shrink-0" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Navigation Arrows */}
            <button 
              onClick={() => setActiveReviewIndex((prev) => (prev - 1 + 4) % 4)}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 dark:bg-black/50 text-[var(--text-primary)] rounded-r-xl shadow-md border border-[var(--border-color)] border-l-0 z-10"
              aria-label="Previous review"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button 
              onClick={() => setActiveReviewIndex((prev) => (prev + 1) % 4)}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 dark:bg-black/50 text-[var(--text-primary)] rounded-l-xl shadow-md border border-[var(--border-color)] border-r-0 z-10"
              aria-label="Next review"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>

            {/* Dots */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1.5 pb-1">
              {homeReviews.map((_, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveReviewIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${idx === activeReviewIndex ? 'bg-[var(--color-forest)] w-4' : 'bg-gray-300 dark:bg-gray-600'}`}
                  aria-label={`Go to review ${idx + 1}`}
                />
              ))}
            </div>
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

          {/* Quick Review Links */}
          <div className="mt-8 flex flex-col items-center">
            <button 
              onClick={() => navigate('/insta-reviews', { state: { from: location.pathname } })}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-3 font-semibold text-white transition-all duration-300 ease-in-out rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 shadow-lg hover:shadow-xl hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 blur-md transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span className="tracking-wide">Watch Stories Reviews</span>
            </button>

            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <a href="https://www.facebook.com/rosaryplanthouse/reviews" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-medium text-[var(--text-primary)]">
                <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
                Facebook Reviews
              </a>
              <a href="https://www.instagram.com/rosary_plant_house" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-medium text-[var(--text-primary)]">
                <svg className="w-4 h-4 text-[#E1306C]" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
                Insta Reviews
              </a>
              <a href="https://maps.app.goo.gl/h5ziUGAuvC4FZZqn8" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-medium text-[var(--text-primary)]">
                <svg className="w-4 h-4 text-[#EA4335]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Google Reviews
              </a>
            </div>
          </div>
        </section>
      )}

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
            <span>{selectedCategory === 'All' ? 'All Plants' : `${selectedCategory} Plants`} <span className="text-xs opacity-70">({hasMore ? `${visibleCount} of ${sortedProducts.length}` : sortedProducts.length})</span></span>
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
