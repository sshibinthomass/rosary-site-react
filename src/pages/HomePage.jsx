import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import { getProducts } from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CATEGORIES } from '../config/constants';

export default function HomePage() {
  const { user } = useAuth();
  const { addToCart, isInCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

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

  const handleAddToCart = async (product) => {
    if (!user) return;
    await addToCart(product);
  };

  const categories = ['All', ...CATEGORIES];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="mb-6">
        <div className="gradient-forest rounded-2xl p-6 text-white">
          <h2 className="text-xl font-semibold">Welcome to Rosary 🌿</h2>
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
              onClick={() => setSelectedCategory(category)}
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
          <div className="grid grid-cols-2 gap-4 stagger-children">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={setSelectedProduct}
              />
            ))}
          </div>
        )}
      </section>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        inCart={selectedProduct ? isInCart(selectedProduct.id) : false}
      />
    </div>
  );
}
