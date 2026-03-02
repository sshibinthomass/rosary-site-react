import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getProducts, getProductById } from '../services/productService';
import { getLimitedPlants } from '../services/limitedService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CATEGORIES } from '../config/constants';

const ProductModal = lazy(() => import('../components/ProductModal'));

const INITIAL_LIMIT = 20;

export default function HomePage() {
  const { categoryName, productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, isInCart, addToWishlist, removeFromWishlist, isInWishlist } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [previousCategory, setPreviousCategory] = useState(null);

  // Determine selected category from URL or default to 'All'
  const selectedCategory = categoryName || 'All';

  // Load products when category changes; also reset pagination
  useEffect(() => {
    loadProducts();
    setShowAll(false);
  }, [selectedCategory]);

  // Load specific product if productId is in URL
  useEffect(() => {
    if (productId) {
      loadProductFromUrl(productId);
    }
  }, [productId]);

  const loadProducts = async () => {
    setLoading(true);
    setShowAll(false);
    try {
      // For category pages, keep current behaviour and show only normal products
      if (selectedCategory !== 'All') {
        const data = await getProducts(selectedCategory);
        setProducts(data);
        return;
      }

      // For home (All), load limited plants and normal products, then show limited first
      const [limited, normal] = await Promise.all([
        getLimitedPlants(), // available-only by default
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
      navigate('/');
    } else {
      navigate(`/category/${encodeURIComponent(category)}`);
    }
  }, [navigate]);

  const handleQuickView = useCallback((product) => {
    // Remember current category before opening plant modal
    setPreviousCategory(selectedCategory);
    setSelectedProduct(product);
    // Update URL without full navigation
    navigate(`/plant/${product.id}`, { replace: true });
  }, [selectedCategory, navigate]);

  const handleCloseModal = useCallback(() => {
    setSelectedProduct(null);
    // Navigate back to previous category or home
    const returnCategory = previousCategory || categoryName;
    if (returnCategory && returnCategory !== 'All') {
      navigate(`/category/${encodeURIComponent(returnCategory)}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
    setPreviousCategory(null);
  }, [previousCategory, categoryName, navigate]);

  const categories = ['All', ...CATEGORIES];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="mb-6">
        <div className="bg-[#faedef] dark:bg-[var(--bg-secondary)] rounded-2xl p-6 text-center text-[var(--text-primary)] relative shadow-sm">
          <p className="mb-3 text-sm md:text-base">
            Please click on <span className="text-[#5cb85c] font-medium">Add to Cart</span> to Select Plants.
          </p>
          <p className="mb-4 text-sm md:text-base">
            If you have any doubts please contact <span className="text-[#5cb85c] font-medium whitespace-nowrap">7904050237</span>. Or any of the below method.
          </p>
          
          <div className="flex justify-center gap-4 mb-6">
            <a href="https://wa.me/917904050237" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 21.841c-1.613 0-3.193-.433-4.577-1.252l-.328-.194-3.398.891.905-3.314-.213-.339A9.813 9.813 0 012.186 12 9.845 9.845 0 0112 2.159 9.845 9.845 0 0121.814 12 9.845 9.845 0 0112 21.841z"></path></svg>
            </a>
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg>
            </a>
            <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path></svg>
            </a>
          </div>

          <div className="mx-auto bg-[#fffbf0] dark:bg-[var(--bg-tertiary)] border-l-4 border-[#f0ad4e] py-3 px-6 text-center inline-block rounded shadow-sm">
            <p className="text-[#c7682a] dark:text-[#f0ad4e] font-medium text-sm md:text-base">
              Purchase for more than 1000/- and get a <span className="text-[#5cb85c]">Complementary plant.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${selectedCategory === category
                  ? 'bg-[var(--color-forest)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--color-forest)]'
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">🌱</span>
            <p className="text-[var(--text-secondary)] mt-3">No plants found in this category</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 stagger-children">
              {(selectedCategory === 'All' && !showAll ? products.slice(0, INITIAL_LIMIT) : products).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={handleQuickView}
                />
              ))}
            </div>

            {/* Show all / Show less — only for the 'All' category */}
            {selectedCategory === 'All' && products.length > INITIAL_LIMIT && (
              <div className="mt-6 flex flex-col items-center gap-1">
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="px-8 py-2.5 rounded-full text-sm font-semibold border border-[var(--color-forest)] text-[var(--color-forest)] hover:bg-[var(--color-forest)] hover:text-white transition-all"
                >
                  {showAll ? 'Show less' : `Show all ${products.length} plants`}
                </button>
                {!showAll && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Showing {INITIAL_LIMIT} of {products.length}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Product Modal - lazy loaded */}
      {selectedProduct && (
        <Suspense fallback={null}>
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

