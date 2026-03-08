import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { CURRENCY } from '../config/constants';
import { NavLink } from 'react-router-dom';
import ProductModal from '../components/ProductModal';
import { resolveImageUrl } from '../utils/imageCompressor';
import { getProductById } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import SEO from '../components/SEO';

const WishlistItem = ({ item, onMoveToCart, onRemove, inCart, onClick, isOutOfStock }) => {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="card p-3 flex gap-3 cursor-pointer" onClick={() => onClick(item)}>
      {/* Image */}
      <div className="w-24 h-24 md:w-20 md:h-20 rounded-lg overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0 relative">
        <img
          src={resolveImageUrl(item.imageUrl) || '/placeholder-plant.jpg'}
          alt={item.name}
          className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-50' : ''}`}
        />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-[var(--text-primary)] truncate">
          {item.productId}. {item.name}
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          {CURRENCY}{item.price?.toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-[var(--text-secondary)] badge badge-forest mt-1 inline-block">
          {item.category}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 items-end">
        {!inCart && !isOutOfStock && (
          <div className="flex items-center bg-[var(--bg-tertiary)] rounded-lg h-7 w-20" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={(e) => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)); }}
              className="px-2 text-[var(--text-primary)] hover:bg-[var(--color-cream)] rounded-l-lg transition-colors flex-1"
            >
              -
            </button>
            <span className="text-xs font-medium w-6 text-center text-[var(--text-primary)]">{quantity}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setQuantity(quantity + 1); }}
              className="px-2 text-[var(--text-primary)] hover:bg-[var(--color-cream)] rounded-r-lg transition-colors flex-1"
            >
              +
            </button>
          </div>
        )}

        {isOutOfStock ? (
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium w-24 text-center bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400">
            Out of Stock
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveToCart(item, quantity); }}
            disabled={inCart}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-24
              ${inCart 
                ? 'bg-[var(--color-forest)]/10 text-[var(--text-primary)]'
                : 'bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-light)]'
              }
            `}
          >
            {inCart ? 'In Cart' : 'Add to Cart'}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(item.productId); }}
          className="text-red-500 hover:text-red-600 text-xs"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, clearWishlist, addToCart, isInCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productStockMap, setProductStockMap] = useState({});

  useEffect(() => {
    if (wishlist.length === 0) return;
    const fetchStockData = async () => {
      const map = {};
      await Promise.all(
        wishlist.map(async (item) => {
          try {
            const isLimited = typeof item.productId === 'string' && /^L/i.test(item.productId);
            const product = isLimited
              ? await getLimitedById(item.productId)
              : await getProductById(item.productId);
            if (product) map[item.productId] = product;
          } catch {}
        })
      );
      setProductStockMap(map);
    };
    fetchStockData();
  }, [wishlist]);

  const isItemOutOfStock = (item) => {
    const product = productStockMap[item.productId];
    if (!product) return false;
    return product.available === false || (product.qtyAvailable === 'NA' && !product.inStock);
  };

  if (wishlist.length === 0) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">💚</span>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-4">Your wishlist is empty</h2>
        <p className="text-[var(--text-secondary)] mt-2">Save plants you love for later!</p>
        <NavLink to="/" className="btn btn-primary mt-4">
          Browse Plants
        </NavLink>
      </div>
    );
  }

  const handleMoveToCart = async (item, quantity = 1) => {
    const product = {
      id: item.productId,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      category: item.category
    };
    await addToCart(product, quantity);
  };

  const handleItemClick = async (item) => {
    try {
      const isLimited = typeof item.productId === 'string' && /^L/i.test(item.productId);
      const fullProduct = isLimited
        ? await getLimitedById(item.productId)
        : await getProductById(item.productId);
      if (fullProduct) {
        setSelectedProduct(fullProduct);
      } else {
        // Fallback to item data if full product not found
        setSelectedProduct({ id: item.productId, ...item });
      }
    } catch (err) {
      // Fallback to item data on error
      setSelectedProduct({ id: item.productId, ...item });
    }
  };

  const handleAddToCart = async (product) => {
    await addToCart(product);
  };

  return (
    <div className="animate-fade-in">
      <SEO title="Your Wishlist" description="Plants you've saved for later. Browse and add to cart from your wishlist." />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Your Wishlist ({wishlist.length})
        </h1>
        <button
          onClick={clearWishlist}
          className="text-sm text-red-500 hover:text-red-600"
        >
          Clear All
        </button>
      </div>

      {/* Wishlist Items */}
      <div className="space-y-3">
        {wishlist.map((item) => {
          const product = productStockMap[item.productId];
          const currentPrice = product?.salesPrice || product?.price;
          const displayItem = currentPrice !== undefined ? { ...item, price: currentPrice } : item;
          
          return (
            <WishlistItem 
              key={item.productId} 
              item={displayItem} 
              onMoveToCart={handleMoveToCart}
              onRemove={removeFromWishlist}
              inCart={isInCart(item.productId)}
              onClick={handleItemClick}
              isOutOfStock={isItemOutOfStock(item)}
            />
          );
        })}
      </div>

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
