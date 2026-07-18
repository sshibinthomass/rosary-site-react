import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CURRENCY } from '../config/constants';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { resolveImageUrl } from '../utils/imageCompressor';
import { getProductDisplayName, getProductPath } from '../utils/productSeo';

export default function ProductCard({ product, index }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [heartAnim, setHeartAnim] = useState(false);
  const { addToCart, addToWishlist, removeFromWishlist, isInCart, isInWishlist } = useCart();
  const { error } = useToast();

  // Normalize product fields (handle both old and new schema)
  const name = getProductDisplayName(product);
  const price = product.salesPrice || product.price;
  const originalPrice = product.originalPrice;
  const inStock = product.available !== false && (product.qtyAvailable !== 'NA' || product.inStock);
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    try {
      await addToCart({ ...product, id: product.id, name, price }, quantity);
    } catch {
      error('Failed to add to cart');
    }
  };

  const handleToggleWishlist = async (e) => {
    e.stopPropagation();
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
    try {
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist({ ...product, id: product.id, name, price });
      }
    } catch {
      error('Failed to update wishlist');
    }
  };

  const inCart = isInCart(product.id);
  const inWishlist = isInWishlist(product.id);
  const plantId = product.id;
  const primaryImage = resolveImageUrl(
    Array.isArray(product.imageUrls) && product.imageUrls.length
      ? product.imageUrls[0]
      : product.imageUrl
  );

  return (
    <div 
      className="card cursor-pointer group dark:border dark:border-[var(--border-color)] overflow-hidden flex flex-col relative"
      onClick={() => navigate(getProductPath({ ...product, title: name }), { state: { backgroundLocation: location, product } })}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-[var(--bg-tertiary)]">
        <img
          src={primaryImage || '/placeholder-plant.jpg'}
          alt={`${name} - ${product.category || 'Plant'} from Rosary Plant House`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading={index < 3 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : undefined}
        />
        
        {/* Discount Badge — top right */}
        {hasDiscount && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-[var(--color-terracotta)] text-white text-[10px] md:text-xs font-bold rounded-lg">
            -{discountPercent}%
          </div>
        )}
        
        {/* Stock Badge — top left */}
        {!inStock && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-[10px] md:text-xs font-medium rounded-lg">
            Out of Stock
          </div>
        )}
        
        {/* Restocked Badge — top left */}
        {product.isRestocked && inStock && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-[10px] md:text-xs font-medium rounded-lg">
            Back in Stock!
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-[var(--color-forest)] text-white text-[10px] md:text-xs font-semibold rounded-lg shadow-md">
          {product.category}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className={`
            absolute bottom-2 right-2 w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-md
            ${heartAnim ? 'animate-heart-pop' : ''}
            ${inWishlist 
              ? 'bg-red-500 text-white' 
              : 'bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-500 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-red-900/30 dark:hover:text-red-400'
            }
          `}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <svg className={`w-5 h-5 md:w-4 md:h-4 ${inWishlist ? 'animate-heart-pop' : ''}`} viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Quick View Button (Hover only) */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <button 
            className="pointer-events-auto btn bg-white/95 text-[var(--color-forest)] hover:bg-white scale-95 group-hover:scale-100 transition-all font-semibold shadow-xl border-none text-sm px-5 py-2 rounded-full flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Quick View
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4 flex flex-col gap-1.5 md:gap-2 bg-[var(--bg-primary)]">
        {/* Line 1: Name with id and size on left, Price on right */}
        <div className="text-sm md:text-base font-semibold text-[var(--text-primary)] flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-xs md:text-sm font-medium text-[var(--text-secondary)]">
              #{plantId}
            </p>
            <p className="leading-snug break-words">
              {name}
              {product.size && (
                <span className="ml-1 text-[var(--text-secondary)] text-xs md:text-sm font-normal">
                  {product.size}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-baseline gap-1 md:gap-2 flex-shrink-0">
            <span className="text-base md:text-lg font-bold">
              {CURRENCY}{price?.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <span className="text-xs md:text-sm text-[var(--text-secondary)] line-through">
                {CURRENCY}{originalPrice?.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* Line 2: Water, Sun, Transit tiles */}
        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--bg-tertiary)]">
            <span className="text-sm leading-none">💧</span>
            <span data-label="Water" className="tile-val text-[10px] font-bold text-[var(--text-primary)] leading-tight">
              {product.watering || 'Med'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--bg-tertiary)]">
            <span className="text-sm leading-none">☀️</span>
            <span data-label="Sun" className="tile-val text-[10px] font-bold text-[var(--text-primary)] leading-tight">
              {product.sunlight || 'Med'}
            </span>
          </div>
          {product.transit && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--bg-tertiary)]">
              <span className="text-sm leading-none">📦</span>
              <span data-label="Ship" className="tile-val text-[10px] font-bold text-[var(--text-primary)] leading-tight">
                {product.transit}
              </span>
            </div>
          )}
        </div>
        
        {/* Line 3: Qty on left, Add to cart on right */}
        <div className="mt-1 md:mt-2 flex items-center gap-2 md:gap-4">
          {inStock ? (
            <>
              {/* Left: quantity selector */}
              {!inCart && (
                <div className="flex items-center bg-[var(--bg-tertiary)] rounded-lg h-9 min-w-[90px] md:min-w-[110px] justify-between">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)); }}
                    className="px-2.5 md:px-3 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-l-lg transition-colors"
                  >
                    -
                  </button>
                  <span className="text-sm md:text-base font-medium w-8 md:w-10 text-center text-[var(--text-primary)]">
                    {quantity}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setQuantity(quantity + 1); }}
                    className="px-2.5 md:px-3 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-r-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Right: Big Add to Cart button */}
              <button
                onClick={handleAddToCart}
                disabled={inCart}
                className={`
                  h-9 md:h-10 px-4 md:px-6 rounded-lg text-sm md:text-base font-semibold flex-1
                  flex items-center justify-center
                  ${inCart 
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-default'
                    : 'bg-[var(--color-forest)] text-white hover:shadow-md active:scale-95'
                  }
                `}
              >
                {inCart ? '✓ In Cart' : 'Add to Cart'}
              </button>
            </>
          ) : (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 px-2 py-1 rounded">
              Out of Stock
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
