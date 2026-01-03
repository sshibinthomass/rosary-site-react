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

  return (
    <div 
      className="card cursor-pointer group dark:border dark:border-[var(--border-color)]"
      onClick={() => onQuickView?.(product)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[var(--bg-tertiary)]">
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
            absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-md
            ${inWishlist 
              ? 'bg-[var(--color-terracotta)] text-white' 
              : 'bg-white/90 text-[var(--text-primary)] hover:bg-[var(--color-terracotta)] hover:text-white dark:bg-gray-800/90 dark:text-white'
            }
          `}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-[10px] text-[var(--text-secondary)] font-medium">#{product.id}</p>
        <h3 className="font-medium text-[var(--text-primary)] truncate text-sm">{name}</h3>
        
        {/* Tags row */}
        <div className="flex gap-1 mt-1 flex-wrap">
          {product.size && (
            <span className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)]">
              {product.size}
            </span>
          )}
          {product.indoor && (
            <span className="text-[9px] px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 rounded text-green-600 dark:text-green-400">
              Indoor
            </span>
          )}
          {product.hanging && (
            <span className="text-[9px] px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400">
              Hanging
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-base font-semibold text-[var(--text-primary)]">
              {CURRENCY}{price?.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[var(--text-secondary)] line-through ml-1">
                {CURRENCY}{originalPrice?.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          
            {inStock ? (
              <div className="flex items-center gap-2">
                {!inCart && (
                  <div className="flex items-center bg-[var(--bg-tertiary)] rounded-lg h-7">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)); }}
                      className="px-2 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-l-lg transition-colors"
                    >
                      -
                    </button>
                    <span className="text-xs font-medium w-4 text-center text-[var(--text-primary)]">{quantity}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setQuantity(quantity + 1); }}
                      className="px-2 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-r-lg transition-colors"
                    >
                      +
                    </button>
                  </div>
                )}
                
                <button
                  onClick={handleAddToCart}
                  disabled={inCart}
                  className={`
                    h-7 px-3 rounded-lg text-xs font-medium transition-all flex items-center
                    ${inCart 
                      ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-default'
                      : 'bg-[var(--color-forest)] text-white hover:shadow-md active:scale-95'
                    }
                  `}
                >
                  {inCart ? '✓ In Cart' : 'Add'}
                </button>
              </div>
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
