import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import { getProducts, getProductById } from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CATEGORIES } from '../config/constants';
import logo from '../assets/logo.png';

export default function HomePage() {
  const { categoryName, productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, isInCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [previousCategory, setPreviousCategory] = useState(null);

  // Determine selected category from URL or default to 'All'
  const selectedCategory = categoryName || 'All';

  // Load products when category changes
  useEffect(() => {
    loadProducts();
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
      const data = await getProducts(selectedCategory === 'All' ? null : selectedCategory);
      setProducts(data);
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

  const handleAddToCart = async (product) => {
    if (!user) return;
    await addToCart(product);
  };

  const handleCategoryClick = (category) => {
    if (category === 'All') {
      navigate('/');
    } else {
      navigate(`/category/${encodeURIComponent(category)}`);
    }
  };

  const handleQuickView = (product) => {
    // Remember current category before opening plant modal
    setPreviousCategory(selectedCategory);
    setSelectedProduct(product);
    // Update URL without full navigation
    navigate(`/plant/${product.id}`, { replace: true });
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    // Navigate back to previous category or home
    const returnCategory = previousCategory || categoryName;
    if (returnCategory && returnCategory !== 'All') {
      navigate(`/category/${encodeURIComponent(returnCategory)}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
    setPreviousCategory(null);
  };

  const categories = ['All', ...CATEGORIES];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="mb-6">
        <div className="gradient-forest rounded-2xl p-6 text-white">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Welcome to Rosary 
            <img src={logo} alt="Logo" className="w-6 h-6 object-contain inline-block" />
          </h2>
          <p className="text-white/80 mt-1 text-sm">
            Discover beautiful succulents & indoor plants
          </p>
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 stagger-children">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={handleQuickView}
              />
            ))}
          </div>
        )}
      </section>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={handleCloseModal}
        onAddToCart={handleAddToCart}
        inCart={selectedProduct ? isInCart(selectedProduct.id) : false}
      />
    </div>
  );
}

