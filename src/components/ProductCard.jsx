import { useState } from 'react';
import { CURRENCY } from '../config/constants';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function ProductCard({ product, onQuickView }) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart, addToWishlist, isInCart, isInWishlist } = useCart();
  const { error } = useToast();

  // Normalize product fields (handle both old and new schema)
  const name = product.title || product.name || product.commonName;
  const price = product.salesPrice || product.price;
  const originalPrice = product.originalPrice;
  const inStock = product.available !== false && (product.qtyAvailable !== 'NA' || product.inStock);
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    try {
      await addToCart({ ...product, id: product.id, name, price }, quantity);
    } catch (err) {
      error('Failed to add to cart');
    }
  };

  const handleAddToWishlist = async (e) => {
    e.stopPropagation();
    try {
      await addToWishlist({ ...product, id: product.id, name, price });
    } catch (err) {
      error('Failed to add to wishlist');
    }
  };

  const inCart = isInCart(product.id);
  const inWishlist = isInWishlist(product.id);
  const plantId = product.displayId || product.serialNo || product.serial || product.index || product.id;

  return (
    <div 
      className="card cursor-pointer group dark:border dark:border-[var(--border-color)] overflow-hidden flex flex-col"
      onClick={() => onQuickView?.(product)}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-[var(--bg-tertiary)]">
        <img
          src={product.imageUrl || '/placeholder-plant.jpg'}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-[var(--color-terracotta)] text-white text-xs font-bold rounded-lg">
            -{discountPercent}%
          </div>
        )}
        
        {/* Stock Badge */}
        {!inStock && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-lg">
            Out of Stock
          </div>
        )}
        
        {/* Restocked Badge */}
        {product.isRestocked && inStock && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-lg">
            Back in Stock!
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute bottom-2 left-2 badge badge-forest text-[10px]">
          {product.category}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleAddToWishlist}
          className={`
            absolute bottom-5 right-5 w-24 h-24 md:bottom-2 md:right-2 md:w-8 md:h-8 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-md
            ${inWishlist 
              ? 'bg-[var(--color-terracotta)] text-white' 
              : 'bg-white/90 text-[var(--text-primary)] hover:bg-[var(--color-terracotta)] hover:text-white dark:bg-gray-800/90 dark:text-white'
            }
          `}
        >
          <svg className="w-10 h-10 md:w-4 md:h-4" viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 bg-[var(--bg-primary)]">
        {/* Line 1: Plant id. Name (size) on left, Price on right */}
        <div className="text-xl md:text-base font-semibold text-[var(--text-primary)] flex items-baseline justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[var(--text-secondary)]">{plantId}.</span>
            <span>{name}</span>
            {product.size && (
              <span className="text-[var(--text-secondary)] text-lg md:text-sm">
                ({product.size})
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-lg font-bold">
              {CURRENCY}{price?.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <span className="text-lg md:text-base text-[var(--text-secondary)] line-through">
                {CURRENCY}{originalPrice?.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* Line 2: Transit, Category, Water, Sun */}
        <div className="flex flex-wrap gap-1.5 text-base md:text-[11px] text-[var(--text-secondary)]">
          {product.transit && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)]">
              Transit: {product.transit}
            </span>
          )}
          {product.category && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)]">
              Category: {product.category}
            </span>
          )}
          {product.watering && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)]">
              Water: {product.watering}
            </span>
          )}
          {product.sunlight && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)]">
              Sun: {product.sunlight}
            </span>
          )}
        </div>
        
        {/* Line 3: Qty on left, Add to cart on right */}
        <div className="mt-2 flex items-center gap-4">
          {inStock ? (
            <>
              {/* Left: quantity selector */}
              {!inCart && (
                <div className="flex items-center bg-[var(--bg-tertiary)] rounded-lg h-10 md:h-9 min-w-[110px] justify-between">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)); }}
                    className="px-3 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-l-lg transition-colors"
                  >
                    -
                  </button>
                  <span className="text-xl md:text-base font-medium w-10 text-center text-[var(--text-primary)]">
                    {quantity}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setQuantity(quantity + 1); }}
                    className="px-3 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-r-lg transition-colors"
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
                  h-12 md:h-10 px-6 rounded-lg text-2xl md:text-base font-semibold flex-1
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
